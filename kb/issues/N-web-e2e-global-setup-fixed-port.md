# E2E global setup always opens port 3000

## Problem

The Playwright global setup warms up the dev server by opening `http://localhost:3000/`, ignoring the base URL that the config derives from `E2E_BASE_URL` and `WEB_PORT_DEV`. With a dev server on any other port, for example in a worktree, the setup fails with `net::ERR_CONNECTION_REFUSED` before any test runs. Without the warm-up, the first tests on a cold dev server time out on `page.goto` while Next.js compiles the pages.

## Code

- Fixed URL: [tests/e2e/global-setup.ts#L8](https://github.com/nextstrain/nextclade/blob/55a98ae70aa910561b6801cdc2bf4c998abb70af/packages/nextclade-web/tests/e2e/global-setup.ts#L8)
- Base URL in config: [playwright.config.ts#L3](https://github.com/nextstrain/nextclade/blob/55a98ae70aa910561b6801cdc2bf4c998abb70af/packages/nextclade-web/playwright.config.ts#L3)

## Fix

Open the configured base URL in the global setup (Playwright passes the full config to the setup function, including `projects[0].use.baseURL`).
