# API gaps

Capabilities the Playlog website requires but the current Go API (`../api`) does **not** support. Nothing here should be worked around silently in the web app; each item either blocks a feature, degrades it, or needs an explicit product decision. This file is the record of what to raise against `playlogdev/api`.

## Steam callback user-experience limitation (current)

This is the most significant gap for milestone 7 (Steam screens).

The Steam OpenID redirect lands on the **API's** callback route, not on the web app:

- `POST /connections/steam/start` returns `{authorization_url}` built from the API's own `APP_BASE_URL`; the callback URL embedded in it is `<API base>/connections/steam/callback?state=…`.
- After the user approves on Steam, their browser is redirected straight to that API route. The handler verifies the OpenID signature, links the account, queues a sync job, and then writes a **raw JSON body directly to the browser**: `{"status":"connected","steam_id":"…","sync_job_id":"…"}` — or a bare JSON error such as `400 steam authentication failed`.

Consequences for the web experience:

1. The user ends up staring at unstyled JSON on the API origin. There is no success page, no branding, no way back into the app flow.
2. The Next.js BFF never learns the outcome of the handshake — there is no `return_to` / relay-state parameter the web app could use to receive the result, and the API offers none.
3. Error cases (`invalid or expired connection state`, `steam authentication failed`, `steam account is already connected to another user`) are equally raw JSON, with no path back to a friendly error screen.

Milestone 7 implements the available workaround deliberately: the web app opens the validated Steam authorization URL in a popup and polls `GET /connections/steam` until `connected` flips to `true`. Once connected, it calls `POST /connections/steam/sync`; because the API returns the existing queued/running job instead of duplicating one, this recovers the callback-created job id and lets the UI poll progress. The flow is bounded, handles blocked/closed popups, and keeps all bearer tokens inside the BFF.

This remains a workaround with real UX cost: polling adds latency, callback failures cannot be surfaced to the parent page, and the popup briefly displays raw JSON. A proper resolution still requires an API change — for example, allowing the callback to redirect to a validated web-app URL with the outcome — and belongs in `playlogdev/api`.

## Email verification and password-reset landing pages

- The verification email links to `<APP_BASE_URL>/verify?token=…` and reset emails link to `<APP_BASE_URL>/reset-password?token=…`, where `APP_BASE_URL` is the **API's** base URL.
- The API registers neither `/verify` nor `/reset-password` as routes, so today these links land on the API's JSON `404 {"error":"not found"}`.
- The web app *can* implement `/verify` and `/reset-password` pages (they just POST the token to `/auth/verify` and `/auth/password/reset` via the BFF), but unless `APP_BASE_URL` points at the web app or the API changes its email templates, users will never reach those pages from the actual emails.

## Library management limitations

1. **No way to remove a game from the library.** There is `POST /library` and `PATCH /library/{id}`, but no `DELETE /library/{id}`. The web UI cannot offer "remove".
2. **Library listing is unpaginated, unfilterable, and unsortable.** `GET /library` returns every entry, newest first, always. Status filtering/shelf tabs must be done client-side over the full payload.
3. **No bulk import from the Steam snapshot.** Matched games in `GET /connections/steam/library` must still be added one-by-one through `POST /library`; there is no "add all" endpoint.

## Feed limitations

4. **Your own activity does not appear in your feed.** `GET /feed` joins strictly over `follows` (events by people you follow). Users following nobody see an permanently empty feed even when they themselves have been logging games.
5. Feed items carry only `{igdb_id, name, cover_url}` for the game — enough for cards, but linking to full detail pages requires `GET /games/{igdb_id}` per item if richer data is needed.

## Profile and social limitations

- **The authenticated account response does not include the username.**
  `GET /auth/me` returns only `{id, email, verified}`. The web app cannot
  automatically construct a "my public profile" link after login without a
  separate trusted username or an API change.
- **There is no user search or discovery endpoint.** A profile can only be
  opened when the visitor already knows the exact lowercase username. The web
  UI therefore provides exact-username navigation and does not offer search
  suggestions.

6. **No profile editing capability at all.** The data model has no display name, bio, avatar, or any mutable profile fields; registration fixes `username` forever. Any "settings → profile" screen has nothing to bind to.
7. **Follower/following lists are usernames only**, newest first, unpaginated: no ids, avatars (which don't exist anyway), or display names, and no way to page long lists.
8. **No individual session revocation.** `GET /auth/sessions` lists sessions with ids and flags `current`, but there is no "revoke this session" endpoint — only logout-current (`POST /auth/logout`) and logout-all (`POST /auth/logout/all`). A settings page can show devices but cannot act on one.

## Account lifecycle limitations

9. **No account deletion or email change endpoints.**

## Discovery limitations

10. **Game search requires authentication** (`GET /games/search` is behind `requireAuth`). Public landing-page search or logged-out discovery is impossible; game *detail* pages, by contrast, are public.
11. Search results are fixed at 10 items with no pagination or filters.

## Non-gaps (explicitly fine for our architecture)

- **No CORS and no cookies on the API.** By design; this is why the BFF exists.
- **Opaque bearer tokens instead of JWTs.** Requires one BFF round-trip per request; acceptable.

## Rate limiting behind the BFF (deployment consequence)

12. **The API rate limiter keys on `RemoteAddr`.** All traffic from a Next.js BFF deployment arrives from the BFF server's address, so every user shares one rate-limit bucket per protected endpoint (login 10/min, register 5/min, etc.). The web deliberately does not spoof `X-Forwarded-For` to work around this. Consequences: a single abusive user can lock out everyone behind the BFF, and limits may need raising (or a shared-store limiter keyed on real client IPs) in `playlogdev/api` before production traffic.
