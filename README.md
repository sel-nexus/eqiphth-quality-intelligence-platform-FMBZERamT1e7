# EQIP Quality Intelligence Portal

Existing frontend-only Vite + React JavaScript demonstration portal. This revision adds `© 2026-27 all rights reserved` to the login page, preserving its persona picker, quick sign-in and browser-local session behavior.

## Run and verify

Requires Node.js 20+ and npm. From the repository root:

```sh
npm install --no-bin-links
node node_modules/vite/bin/vite.js --host 0.0.0.0
node node_modules/vitest/vitest.mjs run
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js install chromium
PW_DISABLE_TS_ESM=1 node node_modules/@playwright/test/cli.js test
```

Playwright starts its Vite server automatically. Its base URL and port can be configured using `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_PORT` (keep these consistent). `node login-preflight.mjs` captures desktop/mobile rendered HTML, accessibility and styles plus screenshots against that server; start the server separately for this evidence script.

Production assets are generated in `dist/`. Serve that directory with a static host that falls back to `index.html` for client-side routes. The existing `vercel.json` supplies SPA route rewrites. The project remains at the repository root; no framework or directory migration is needed. Existing build-time configuration is documented in `.env.example`.

## Login and limitations

The existing login is explicitly a demo, not production authentication: choose a persona and enter any password, or use quick sign-in. The session is persisted locally in the browser; no backend or server database is part of this application. This revision does not add or change authentication, APIs or persistence. Do not use demo login as a production security boundary.

The copyright year is deliberately literal `2026-27`, not calendar-derived, and the notice names no legal owner.

## Verification scope and inherited issues

Focused component and browser checks cover the footer text, accessibility, responsive layout and existing login/navigation behavior. The adopted repository had no test cases (baseline Vitest exited 1); its production build passed with a large-bundle warning. Dependency installation reported inherited security advisories. Those advisories and unrelated portal workflows are not repaired or claimed fully verified by this presentation-only revision. See `CHANGELOG.md` for modified files and migration notes.
