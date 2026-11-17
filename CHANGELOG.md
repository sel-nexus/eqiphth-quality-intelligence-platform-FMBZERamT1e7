# Changelog

## Login copyright footer

- Added one semantic, noninteractive footer on the unauthenticated login page: `© 2026-27 all rights reserved`.
- Used existing typography/spacing and readable slate text; footer remains in normal flow below the demo hint, not fixed over controls.
- Preserved persona selection, password input, quick sign-in, validation, local session persistence and navigation. No copyright owner is invented; year text is literal.

### Files and verification

- `src/pages/auth/LoginPage.jsx`: four-line footer addition plus `min-w-0` on the form flex panel to prevent overflow at 320px; no handler changes.
- `src/pages/auth/LoginPage.test.jsx`: nine focused component/regression cases.
- `e2e/login-copyright.spec.js`, `playwright.config.js`: real-browser notice, reload, responsive geometry, keyboard and quick-login/session checks.
- `package.json`: pinned Playwright testing dependency.
- `vitest.config.js`: component-only discovery; removed stale reference to absent `src/setupTests.js`.
- `.gitignore`: pipeline and browser output exclusions; `README.md`: runtime/test instructions and inherited demo limitations.
- `login-preflight.mjs`: rendered accessibility/style/HTML evidence capture for review.

### Compatibility and migration

No breaking changes, data migrations, new APIs, backend, framework or directory migration. Existing frontend-only demo authentication remains unsuitable as a production security boundary. Build-time static hosting and SPA fallback remain unchanged.

### Inherited issues

Baseline production build passed with a large-bundle warning. Baseline Vitest found no tests. npm reported security advisories in inherited dependencies; no unrelated breaking upgrades were applied. New testing dependencies also require routine security maintenance. Verification results are provided in the Development test report; unrelated portal features are outside this revision's assurance scope.
