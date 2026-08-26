# Authentication architecture

How Playlog Web authenticates: the browser talks only to Next.js Route Handlers; only the Next.js server talks to the Go API. The Go API remains the sole authentication authority.

```
Browser  --(HttpOnly cookies)-->  Next.js BFF (Route Handlers / RSC)  --(Bearer tokens)-->  Go API
```

## Trust boundary

- Bearer tokens exist only inside the Next.js server process and in `HttpOnly` cookie values, which browser JavaScript cannot read.
- No `NEXT_PUBLIC_` variable exposes `API_BASE_URL`; it is read only in `server-only` modules (`src/lib/api/server.ts`, `src/lib/auth/*`).
- Tokens are never returned in response bodies, placed in URLs (except the email-link token flows, which are consumed server-side and never echoed), stored in browser storage, or logged. Logging is prohibited for passwords, tokens, `Cookie`/`Authorization` headers, and complete auth request bodies.

## Cookies

| Name | Contents | HttpOnly | Lifetime | Purpose |
|---|---|---|---|---|
| `playlog_at` | Go API access token | yes | `expires_in` seconds (mirrors token validity, default 900 s) | Authenticated requests |
| `playlog_rt` | Go API refresh token | yes | 30 days (documented default of the API's session lifetime) | Session continuation |
| `playlog_at_exp` | Access-token expiry epoch seconds — **non-secret** | no | same as `playlog_at` | Client-side refresh scheduling only |

All cookies: `SameSite=Lax`, `Path=/`, `Secure` in production. `SameSite=Lax` is chosen because the app is same-origin only (no cross-site sign-in returns), it blocks CSRF on cross-site POSTs, and it keeps the email-link GET navigations working.

**Refresh-cookie lifetime decision**: the API does not return the refresh token's expiry (it is capped server-side at the session's absolute 30-day lifetime and never extended by rotation). Mirroring the documented 30-day default is deliberate: a cookie that outlives server-side validity is harmless because every use is validated by the API, and every failure path clears the cookies.

## Access-token expiry handling

A small client component (`SessionRefresher`, mounted once in the shell) reads `playlog_at_exp`, schedules `POST /api/auth/refresh` shortly before expiry, reschedules on tab focus, and hard-navigates to login if refresh reports the session is gone. This keeps the access token valid for server renders without ever refreshing during RSC (Server Components cannot mutate cookies; a refresh there would drop the rotated refresh token and risk reuse detection).

## Refresh-token rotation and race prevention

The API's refresh tokens are single-use; presenting an already-used token revokes the whole session.

- **Server side** (`src/lib/auth/refresh.ts`): a single-flight coordinator keys an in-flight promise map by SHA-256 of the refresh token. Concurrent callers presenting the same token await one shared upstream refresh; the key is removed only after settlement. Covered by focused unit tests (`tests/refresh.test.ts`).
- **Browser side** (`src/lib/auth/client-session.ts`): refresh triggers are deduped per tab (in-flight promise) and serialized across tabs with Web Locks; a BroadcastChannel tells other tabs to reschedule from the renewed expiry cookie. The browser layer never receives token material — only `{ ok, expiresIn }`.
- **No refresh in proxy.ts.** No "retry every 401 after refreshing" wrapper. Logout-all uses the same coordinator if it needs a fresh token.

### Residual multi-instance limitation

The coordinator is per-process. If the Next.js app is deployed with multiple instances, two instances can refresh the same token concurrently; the API's reuse detection then revokes the session and the user must sign in again. Mitigations for a future milestone: sticky sessions, a shared lock store (e.g. Postgres advisory lock), or accepting the rare re-login. Single-instance deployments (the current plan) are not affected.

## CSRF protection

Every cookie-authenticated mutation Route Handler validates `Origin` against the request `Host`, and rejects `Sec-Fetch-Site` values other than `same-origin`/`none`. A request with neither `Origin` nor fetch metadata is rejected (browsers always attach `Origin` to same-origin POST/PATCH fetches; only non-browser clients omit it — they must send the headers explicitly, e.g. in tests). Local development behaves identically: `http://localhost:3000` matches its own host.

## API error mapping

`ApiError` (in `src/lib/api/errors.ts`) normalizes every upstream failure:

- API JSON `{error}` on 4xx -> that status + message (safe, human-readable)
- 5xx, non-JSON, malformed JSON, oversized responses -> generic 500/502 message
- network failure / timeout (5 s `AbortSignal`) -> 503 generic message
- 429 -> status forwarded with the upstream `Retry-After` header preserved

Browsers never see internal URLs, stack traces, or raw upstream bodies.

## Protected-route behavior

- `src/proxy.ts` performs optimistic gating only: protected shell paths (`/home`, `/library`, `/discover`, `/activity`, `/profile`) without a refresh cookie are redirected to `/login?next=<path>`. It never calls the API or refreshes tokens, and is not a security boundary.
- The shell layout runs `requireSession()` on every render: the access token is verified against `GET /auth/me` (cookie presence alone proves nothing). 401s route through `GET /api/auth/expired`, which clears cookies and redirects to login with a validated internal return path.
- `/login` and `/signup` redirect to `/home` only after `GET /auth/me` verifies an active session — a stale cookie is not enough.
- `next` parameters are validated by `safeInternalPath` (same-origin absolute paths only).

## Logout failure behavior

- **Current session**: best-effort upstream revocation; local cookies are always cleared. The response carries `upstream_revoked` so the UI never claims the API session was revoked when the call failed (a 401 counts as revoked — the session was already invalid).
- **All sessions**: strict. Requires a working upstream call (refreshing once through the central coordinator if needed). Failure is surfaced as an error; local cookies are intentionally kept so the user can retry.

## Multi-tab notes

Tabs share the HttpOnly cookies, so a refresh in one tab renews all tabs. The BroadcastChannel reschedule prompt keeps other tabs' timers honest. Tabs created from a stale HTML cache may hold an outdated schedule; the focus handler corrects it.

## Known Go API limitations affecting this design

- Verification and password-reset emails link to the API's `APP_BASE_URL` (`/verify`, `/reset-password`). The web implements these routes; the deployed API must either point `APP_BASE_URL` at the web app or change its email templates. For local testing, Mailpit tokens can be opened manually at the equivalent web URL.
- `GET /auth/me` returns no username; none is invented or persisted after login.
- No per-session revocation for non-current sessions; the UI offers logout-current and logout-all only.
- The API rate limiter keys on `RemoteAddr`; all BFF traffic shares one bucket per deployment. IP headers are not spoofed to work around it (see `docs/api-gaps.md`).
