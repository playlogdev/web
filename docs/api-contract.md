# Playlog API Contract (verified)

> Milestone 6 verification: `GET /feed` always serializes `next_cursor`; its
> value is an opaque string when another page may exist and JSON `null`
> otherwise. Web clients pass the string through without decoding it.

This document records the **verified** contract of the Playlog Go API (`playlogdev/api`, sibling repo `../api`) as of the source inspected for issue #3. Every route, field, status code, and behavior below was cross-checked against the API source (`internal/httpapi/router.go` and handler files) and its tests. Nothing here is invented.

If a web feature needs something this API does not provide, record it in [`api-gaps.md`](./api-gaps.md). Never invent endpoints, request fields, or response fields.

## General properties

- **Base URL**: configured via the API's `APP_BASE_URL` (default `http://localhost:8080`). The web BFF reads it from its own server-only env var (`API_BASE_URL`). It must never be exposed with a `NEXT_PUBLIC_` prefix.
- **Content type**: all request and success bodies are JSON. All error bodies are `{"error": "<message>"}`.
- **Authentication**: bearer-only. `Authorization: Bearer <token>`. There is no cookie support and no CORS handling on the API — which is exactly why the browser must only ever talk to the Next.js BFF.
- **Auth modes per route**: `requireAuth` (401 without a valid token), `optionalAuth` (public, personalizes the response when a valid token is present — but an *invalid* token still fails closed with 401).
- **Unknown routes/methods**: `404 {"error": "not found"}`.
- **Rate limiting**: fixed-window, per client IP, in-memory. Applies per minute (`authEndpointRateWindow = time.Minute`) to: login 10, register 5, refresh 30, verify/resend 5, forgot-password 5, change-password 10, game search 60, game detail 60, library add 30, follow 60, steam connect start 5, steam sync 5. Over-limit responses are `429 {"error": "too many requests, try again later"}` with a `Retry-After` header (seconds).

## Shared object shapes

### Game (`igdb.Game`, source: `internal/igdb/search.go`)

```json
{
  "igdb_id": 1020,
  "name": "Hollow Knight",
  "slug": "hollow-knight",
  "summary": "…",
  "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/….jpg",
  "first_release_date": "2017-02-24",
  "genres": ["Platformer", "Metroidvania"],
  "developers": ["Team Cherry"],
  "publishers": ["Team Cherry"]
}
```

- `slug`, `summary`, `cover_url`, `first_release_date`, `genres`, `developers`, `publishers` are omitted when absent (`omitempty`) — treat every field except `igdb_id` and `name` as optional in TypeScript types.
- `cover_url` is rewritten by the API to the `t_cover_big` size and always uses `https`.
- `first_release_date` is `YYYY-MM-DD` or omitted.

### Library entry (`libraryEntryResponse`, source: `internal/httpapi/library.go`)

```json
{
  "id": "uuid",
  "status": "playing",
  "rating": 4.5,
  "review": "…",
  "started_at": "2025-01-03",
  "completed_at": null,
  "game": { …Game },
  "created_at": "2026-08-22T12:00:00Z",
  "updated_at": "2026-08-22T12:00:00Z"
}
```

- Statuses are exactly: `backlog` | `playing` | `completed` | `dropped`. Default on create when omitted: `backlog`.
- `rating`: number between **0.5 and 5 inclusive, in half-point increments**, or `null`.
- `review`: string up to **10,000 UTF-8 bytes** at the HTTP handler (the
  database constraint is 10,000 characters), or `null`. The byte limit is
  the effective public API behavior and is therefore what clients must enforce.
- `started_at` / `completed_at`: `YYYY-MM-DD` strings or `null`; `completed_at` must be on or after `started_at`.

### Sync job (`steamSyncJobResponse`, source: `internal/httpapi/steam.go`)

```json
{
  "id": "uuid",
  "status": "running",
  "total_count": 0,
  "matched_count": 0,
  "unmatched_count": 0,
  "error": null,
  "started_at": null,
  "completed_at": null,
  "created_at": "2026-08-22T12:00:00Z"
}
```

- Job statuses: `queued` | `running` | `completed` | `failed`.

## Authentication

Token model (source: `internal/auth/token.go`, `internal/httpapi/auth.go`):

- Login creates a **session** with an absolute expiry (`REFRESH_TOKEN_TTL`, default 30 days). Every token minted under it expires no later than that session expiry — refresh extends nothing indefinitely.
- Access tokens are opaque random strings (default TTL 15 minutes, returned as `expires_in` seconds); the API stores only hashes.
- Refresh tokens are **single-use, rotating**: presenting a token consumes it and issues a new pair. Presenting an *already-used* refresh token is treated as theft and revokes the **entire session**. Logout/password reset revoke sessions server-side.

### Endpoints

| Method & path | Auth | Request body | Success | Notes |
|---|---|---|---|---|
| `POST /auth/register` | – | `{email, username, password}` | `201 {id, email, username}` | Username: 3–30 chars, `[a-z0-9_]` only. Password: 8–72 bytes. Sends verification email. **No tokens returned**; login is blocked until verified. `409 email already registered` / `409 username already taken`. |
| `POST /auth/verify` | – | `{token}` | `200 {"status":"verified"}` | Single-use token from the email link. `400 invalid or expired token`. |
| `POST /auth/verify/resend` | – | `{email}` | Always `200 {"status":"ok"}` | Enumeration-safe: identical answer whether or not the address exists/is unverified. |
| `POST /auth/login` | – | `{email, password}` | `200 {access_token, refresh_token, expires_in}` | `expires_in` = access-token lifetime in seconds. `401 invalid email or password`; `403 {"error":"email not verified"}`. |
| `POST /auth/refresh` | – | `{refresh_token}` | `200 {access_token, refresh_token, expires_in}` | Rotates the pair. Reuse detection ⇒ whole session revoked, `401 invalid refresh token`. |
| `POST /auth/password/forgot` | – | `{email}` | Always `200 {"status":"ok"}` | Enumeration-safe. Emails reset link. |
| `POST /auth/password/reset` | – | `{token, password}` | `200 {"status":"reset"}` | Consumes single-use token; **revokes all sessions** of the account. |
| `PATCH /auth/password` | required | `{current_password, new_password}` | `200 {"status":"password changed"}` | Revokes all *other* sessions; current session survives. `401 current password is incorrect`. |
| `POST /auth/logout` | required | – | `204` (no body) | Revokes calling session only. |
| `POST /auth/logout/all` | required | – | `204` | Revokes every session of the user. |
| `GET /auth/sessions` | required | – | `200 {sessions: [{id, created_at, expires_at, current}]}` | Active sessions, newest first. `current` flags the caller's own session. |
| `GET /auth/me` | required | – | `200 {id, email, verified}` | Minimal identity check for the BFF. |

### Bearer requirements and failure codes

- Missing/malformed header on a protected route: `401 {"error": "missing or malformed authorization header"}`.
- Unknown, expired, revoked token, or revoked/expired session: `401 {"error": "invalid or expired token"}`.
- On `optionalAuth` routes (`GET /games/{igdb_id}`, `GET /users/{username}`, `GET /games/search`'s neighbor detail route): an absent token proceeds anonymously, but a present-and-invalid token still returns 401. The BFF must therefore never forward stale tokens blindly on public pages without deciding how to handle that failure.

## Games search and details

| Method & path | Auth | Query/body | Success | Notes |
|---|---|---|---|---|
| `GET /games/search` | required | `?q=<query>` | `200 {games: [Game]}` | Query is whitespace-normalized; the normalized query must be **2–100 UTF-8 bytes** (the Go handler measures with `len()`, which counts bytes) else `400`. Fixed result size of **10** (not configurable). `503 {"error":"game search is unavailable"}` if IGDB is down/unconfigured. |
| `GET /games/{igdb_id}` | optionalAuth | – path id must be a positive integer | `200 {game: Game, stats, friends_activity}` | Public game page data. `400 invalid game id`; `404 {"error":"game not found"}`; `503` if IGDB unavailable. |

`stats` (`gameStatsResponse`): `{backlog, playing, completed, dropped, total_logged, rating_count, average_rating}` — community counts across all users' library entries for that game; `average_rating` is `null` until someone has rated it.

`friends_activity`: **JSON `null` when the caller is unauthenticated** (render as "log in to see this"); otherwise a possibly-empty array of `{username, status, rating}` for followed friends who logged the game.

## Personal library

| Method & path | Auth | Body | Success | Notes |
|---|---|---|---|---|
| `POST /library` | required | `{igdb_id, status?, rating?, review?, started_at?, completed_at?}` | `201` full entry | Only `igdb_id` required; other fields optional/null. Validation errors as `400` (see shared rules above). `404 game not found`; `409 {"error":"game already in library"}`. Emits one `logged` feed event. Rate-limited 30/min. |
| `GET /library` | required | – | `200 {library: [entry]}` | Caller's entries, newest first. **No pagination** (see gaps). |
| `PATCH /library/{id}` | required | Partial: any of `status`, `rating`, `review`, `started_at`, `completed_at` | `200` updated entry | Only fields present in the body change. Explicit JSON `null` clears a nullable field (`rating`, `review`, dates); `status: null` is rejected. Empty body ⇒ `400 {"error":"no fields to update"}`. Unknown id **or someone else's entry** both return `404`. Emits `status_changed` / `rated` / `reviewed` feed events for non-null updates. |

There is **no DELETE** for library entries (see gaps).

## Profiles and follows

| Method & path | Auth | Success | Notes |
|---|---|---|---|
| `GET /users/{username}` | optionalAuth | `200 {username, library, follower_count, following_count, is_following?}` | Public profile incl. full public library. `is_following` is present **only** for an authenticated caller viewing someone else. `404 user not found`. |
| `POST /users/{username}/follow` | required | `204` | `404 user not found`; `400 cannot follow yourself`; `409 already following`. Rate-limited 60/min. |
| `DELETE /users/{username}/follow` | required | `204` | Idempotent: unfollowing a non-followed user also returns 204. |
| `GET /users/{username}/followers` | none | `200 {followers: [username]}` | Usernames only, newest first. Public, unpaginated. |
| `GET /users/{username}/following` | none | `200 {following: [username]}` | Same semantics as followers. |

## Feed

| Method & path | Auth | Query | Success | Notes |
|---|---|---|---|---|
| `GET /feed` | required | `?limit=<int>` (1–100, default 30; out-of-range values silently clamp/default), `?cursor=<opaque>` | `200 {events: [...], next_cursor: string \| null}` | Chronological, newest first. |

- Event item: `{id, username, event_type, status?, rating?, review?, created_at, game: {igdb_id, name, cover_url}}`.
- `event_type` values: `logged`, `status_changed`, `rated`, `reviewed`.
- The feed contains **only events from users the caller follows** — the caller's own activity does not appear (see gaps).
- Cursor pagination is keyset-based `(created_at, id)`; cursors are opaque base64 strings. `next_cursor` is a string when a full page was returned and JSON `null` otherwise. The web app passes it through without decoding it. Invalid cursor ⇒ `400 {"error":"invalid cursor"}`.

## Steam connection and sync

Flow: the web app calls `start`, redirects the browser to the returned Steam OpenID URL; Steam redirects back to the API's callback (see the UX limitation in [gaps](#steam-callback-user-experience-limitation)); sync then runs asynchronously through a DB-backed worker (poll the job status; worker polls every ~2s).

| Method & path | Auth | Body/query | Success | Notes |
|---|---|---|---|---|
| `POST /connections/steam/start` | required | – | `200 {authorization_url}` | Redirect browser to `authorization_url`. Flow state lives server-side, TTL 10 min. Rate-limited 5/min. `503` if Steam integration unconfigured. |
| `GET /connections/steam/callback` | – (browser redirect target) | Steam OpenID query params | `200 {"status":"connected","steam_id","sync_job_id"}` | Handled entirely by the API; returns raw JSON to the browser. Errors: `400 invalid or expired connection state`, `400 steam authentication failed`, `409 {"error":"steam account is already connected to another user"}`. |
| `GET /connections/steam` | required | – | `200 {connected, steam_id?, connected_at?, last_synced_at?, game_count}` | Not connected ⇒ `{"connected": false, "game_count": 0}` with optional fields omitted. |
| `DELETE /connections/steam` | required | – | `204` | Disconnects (idempotent). |
| `POST /connections/steam/sync` | required | – | `202` job object | Queues a sync. `409 {"error":"steam account is not connected"}`; `503` if unavailable. Returns the existing active job instead of duplicating if one is queued/running. Rate-limited 5/min. |
| `GET /connections/steam/sync/{id}` | required | – | `200` job object | Poll while `queued`/`running`. `404 sync job not found` (also for ids belonging to another user). |
| `GET /connections/steam/library` | required | `?limit=` (default 50, max 200), `?offset=` | `200 {games: [...], total, limit, offset}` | Offset-paginated snapshot of the imported Steam library, sorted by name. Items: `{steam_app_id, steam_name, playtime_minutes, matched, game?, last_seen_at}` where `game` is a full `Game` when IGDB-matched, otherwise `null` with `matched: false`. |

## Pagination behavior summary

- **Feed**: keyset cursor pagination (`limit` + opaque `cursor`, `next_cursor` in response).
- **Steam library**: classic offset pagination (`limit` ≤ 200 + `offset`, `total` echoed back).
- **Everything else**: unpaginated — game search is a fixed 10 results; library listings, profiles (full library), sessions, and follower/following lists return complete arrays. Web pages must not assume more endpoints exist.

## Error responses worth handling explicitly

| Status | Meaning | Where the web should surface it deliberately |
|---|---|---|
| `400` | Validation failures (`{"error": "…"}` with a specific human-readable message) | Inline form errors; message text is safe to display |
| `401` | Missing/invalid/expired bearer token, bad credentials, wrong current password | Trigger refresh flow, then sign-out state if refresh also fails |
| `403` | `{"error":"email not verified"}` on login | Route to the "check your email / resend verification" flow |
| `404` | Unknown route, unknown user/game/library entry/sync job | Not-found UI states |
| `409` | Duplicate registration fields, duplicate library add, duplicate follow, Steam account bound elsewhere, sync without connection | Distinct "already exists / already connected" messaging |
| `429` | Per-IP rate limit, includes `Retry-After` header | Disable submit controls and honor the wait |
| `500` | `{"error":"internal server error"}` | Generic failure state; never expose internals |
| `503` | IGDB or Steam integration unavailable/degraded | Feature-level degraded states ("search temporarily unavailable") |

## Capability-to-web-page mapping

| Planned web page / capability | API capability | Verified endpoints |
|---|---|---|
| Register / verify / login screens | Full support | `POST /auth/register`, `/auth/verify`, `/auth/verify/resend`, `/auth/login` |
| Session management (BFF HttpOnly cookies) | Full support | `POST /auth/refresh`, `/auth/logout`, `/auth/logout/all`, `GET /auth/me`, `GET /auth/sessions` |
| Password screens | Full support | `POST /auth/password/forgot`, `/auth/password/reset`, `PATCH /auth/password` |
| Search page (typeahead/results) | Supported, fixed 10 results, auth-required | `GET /games/search` |
| Game detail page | Full support (public + personalized) | `GET /games/{igdb_id}` |
| Add/edit library entry | Full support | `POST /library`, `PATCH /library/{id}` |
| Remove from library | **Missing** | See gaps |
| My library page | Supported, unpaginated | `GET /library` |
| Public profile page | Full support | `GET /users/{username}`, `/followers`, `/following` |
| Follow/unfollow buttons | Full support | `POST`/`DELETE /users/{username}/follow` |
| Home feed | Full support, cursor-paginated | `GET /feed` |
| Steam connect screen | Supported, with callback UX limitation | `POST /connections/steam/start`, `GET /connections/steam` |
| Steam sync progress screen | Full support (poll job) | `POST /connections/steam/sync`, `GET /connections/steam/sync/{id}` |
| Steam library browse/import screen | Supported, offset-paginated | `GET /connections/steam/library` |
| Account settings (profile editing) | **Missing** (no display name/bio/avatar anywhere in the API) | See gaps |
| Email-verification and password-reset landing pages | Endpoints exist; email links currently point at the API host, not the web app | See gaps |
