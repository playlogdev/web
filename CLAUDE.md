# Playlog Web

Playlog Web is a Next.js App Router frontend and backend-for-frontend (BFF) for the Playlog Go API. It is a separate repository and must remain independently deployable.

The developer is learning modern Next.js and React architecture. Explain the why behind non-obvious choices, especially Server Components, client boundaries, caching, cookies, and Route Handlers.

## Sources of truth

- Web repository: https://github.com/playlogdev/web
- The completed API is the sibling repository at ../api and https://github.com/playlogdev/api.
- Treat ../api as read-only. Never edit, stage, commit, push, or create files there.
- Inspect API handlers, request and response structs, README, and migrations when the real contract is needed. Never invent endpoints or response fields.
- Record missing backend capabilities in docs/api-gaps.md instead of changing the API repository.
- The visual reference is docs/brand/playlog_brand_design.jpg. It is direction, not a pixel-perfect specification.
- CLAUDE.md is the single source of project rules. AGENTS.md must remain a symlink whose target is exactly CLAUDE.md. Edit CLAUDE.md, never replace the symlink with copied content.

## Current stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- ESLint 9 with eslint-config-next
- npm with the committed package-lock.json

Prefer the platform and framework before adding dependencies. Add a package only for a concrete requirement, explain why it is needed, and avoid overlapping libraries.

## Architecture

- The browser must never call the Go API directly. The Go API is bearer-only and has no browser CORS or cookie behavior.
- The request path is Browser -> Next.js BFF -> Go API.
- Prefer Server Components for server-owned data and rendering. Add Client Components only for real browser state or interaction, and keep use-client boundaries narrow.
- Use explicit Next.js Route Handlers or server-side functions as the BFF boundary.
- API_BASE_URL is server-only. Never expose it with a NEXT_PUBLIC_ prefix.
- Access tokens, refresh tokens, API secrets, and provider credentials must never be readable by browser JavaScript or included in client bundles.
- Authentication cookies must be HttpOnly, Secure in production, and use an explicit SameSite policy. Handle refresh-token rotation and failure deliberately.
- Validate untrusted input at the BFF boundary. Preserve useful API errors without leaking secrets or internal details.
- Do not proxy every endpoint through one untyped catch-all. Keep explicit typed boundaries for product capabilities.
- Do not use mock data in production paths. Clearly label temporary design fixtures and make them easy to remove.

## Project organization

- src/app contains routes, layouts, loading and error boundaries, and Route Handlers.
- src/components contains reusable UI components. Keep feature-specific components near their feature when sharing would create a vague abstraction.
- src/lib contains server API clients, auth helpers, validation, and non-UI code.
- src/styles may contain shared tokens or utilities when globals become too large.
- docs/api-contract.md records the verified API-to-web feature matrix.
- docs/api-gaps.md records web requirements the current API cannot support.

Do not create speculative layers, generic component factories, or a global state store before a concrete need exists.

## Brand and interface rules

- Position Playlog as a personal game journal.
- Primary message: Track. Rate. Remember.
- Core colors: background #0F1115, surface #1A1F24, brand green #22C55E, teal #06B6D4, blue #3B82F6, violet #8B5CF6, primary light text #F5F6F7.
- Use Sora as the primary typeface unless testing demonstrates a readability issue.
- Green is the primary identity color. Use the multicolor gradient sparingly for marketing emphasis.
- Build reusable tokens and primitives instead of scattering raw values.
- Interactive controls need applicable hover, focus-visible, active, disabled, loading, error, and empty states.
- Target WCAG AA contrast, keyboard operation, visible focus, semantic HTML, reduced-motion support, and responsive layouts from small mobile screens upward.
- Do not crop the JPG brand board into production logos. Use proper SVG assets when the logo system is implemented.

## Product milestones

Work incrementally. Never attempt the entire website in one issue or pull request.

1. Repository rules and verified API contract
2. Design system and responsive application shell
3. Authentication BFF
4. Game search and game details
5. Personal library
6. Profiles, follow relationships, and feed
7. Steam connection and synchronization screens
8. Responsive refinement, accessibility, and Playwright tests
9. Production deployment

Complete only the active milestone. Wait for the user to review and merge its pull request before starting the next milestone.

## GitHub workflow

Every milestone or independently reviewable fix must follow this workflow:

1. Start from a clean, up-to-date main branch.
2. Create a GitHub issue in playlogdev/web before implementation. Include context, acceptance criteria, exclusions, and a verification plan.
3. Create a dedicated branch from main named feat/<issue-number>-description, fix/<issue-number>-description, or chore/<issue-number>-description.
4. Implement only the issue scope. Never mix unrelated cleanup into the change.
5. Run the required verification commands.
6. Before committing or pushing, stop and show the user the changed behavior and files, important decisions, verification results, limitations, and follow-up work.
7. Wait for explicit user approval. Then commit intentionally, push the branch, and open a pull request containing Closes #<issue-number>.
8. Include a concise summary, test plan, screenshots for visible UI changes, and residual risk in the pull request.
9. Never push implementation work directly to main.
10. Never merge the pull request, enable auto-merge, or close the issue manually. The user reviews and merges it.

Keep one active milestone pull request at a time unless the user explicitly requests parallel work. Never rewrite public history or force-push unless explicitly requested.

## Verification

For every change, run checks relevant to the scope. At minimum:

    npm run lint
    npm run build

When a test script exists, also run:

    npm test

For user-visible flows, run relevant Playwright tests once Playwright is introduced. Test affected pages in a real browser at mobile and desktop sizes. A successful build alone does not prove an interaction works.

Never claim a check passed unless it was actually run. Report skipped checks and the reason.

## Working discipline

- Preserve unrelated user changes and never discard work to make the tree clean.
- Keep secrets out of Git. Commit .env.example, never .env or real credentials.
- Prefer small cohesive commits with conventional commit messages.
- Never change API behavior from this repository.
- Never deploy, merge, or make unrelated external changes without explicit user approval.
- Comments explain non-obvious constraints or decisions, not the code itself.
- Keep documentation synchronized with behavior and configuration.
