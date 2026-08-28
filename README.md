# Playlog Web

The Next.js frontend for Playlog, a personal game journal for tracking, rating,
and remembering games. The browser talks only to same-origin Route Handlers;
those BFF routes keep API bearer tokens in HttpOnly cookies and call the sibling
Go API server-side.

## Requirements

- Node.js 20 or newer
- npm
- the Playlog API for ordinary local development

Copy `.env.example` to `.env.local` and set the server-only API base URL. Never
expose this value with a `NEXT_PUBLIC_` prefix.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The default local configuration expects the Go
API at <http://127.0.0.1:8080>.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

Unit tests use Vitest and cover validation, upstream response boundaries,
cookie/session behavior, CSRF protection, and BFF Route Handlers.

## End-to-end and accessibility tests

Install the pinned Playwright package with the normal dependencies, then install
its Chromium binary once:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

The Playwright configuration starts two isolated local processes:

- a deterministic fixture API on `127.0.0.1:8092`;
- the Next.js development server on `127.0.0.1:3001`, configured to use that
  fixture.

No real account, database, Steam account, Steam key, or IGDB key is used. The
suite runs Chromium at 1440×900 desktop, 820×1180 tablet/narrow desktop, and
375×812 mobile viewports. It covers public/authentication, game discovery,
library, social/feed, and Steam screens, checks horizontal overflow, exercises
keyboard interaction, and runs WCAG A/AA Axe checks on representative states.

Playwright writes failure screenshots and traces to ignored `test-results/` and
HTML reports to ignored `playwright-report/`.

## Repository workflow

Read `AGENTS.md`, `CLAUDE.md`, `docs/api-contract.md`, and `docs/api-gaps.md`
before changing behavior. Each milestone is developed on an issue branch and
reviewed through a pull request; implementation is never pushed directly to
`main`.
