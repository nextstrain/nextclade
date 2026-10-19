# Stale Nextclade Web unit tests

## Problem

Nextclade Web runs its unit tests with vitest (`bun run test:unit` in `packages/nextclade-web`). 6 of the existing test files fail, because the tests were not updated when the code and the test runner changed:

- 4 files import the helper `src/helpers/jestUtils`, which commit `b7888b871` ("chore: upgrade Next.js Node, npm packages, use bun") deleted. The files fail to load, so none of their tests run
- `getDatasetServerUrl.test.ts` calls `jest.resetModules()`. There is no `jest` object under vitest, so all 29 tests fail in `beforeEach`. `parseGitHubRepoShortcut.test.ts` and `parseGithubRepoUrl.test.ts` make the same call
- `parseAminoacidChange.test.ts` expects the old field names `gene`, `refAA`, `codon` and `queryAA`. `fn parseAminoacidChange()` now returns a `Partial<AaSub>` with `cdsName`, `refAa`, `pos` and `qryAa`, so all 10 tests fail

## Code

- `packages/nextclade-web/src/io/__tests__/parseGitHubRepoShortcut.test.ts`: imports `src/helpers/jestUtils`, calls `jest.resetModules()`
- `packages/nextclade-web/src/io/__tests__/parseGitHubRepoShortcutComponents.test.ts`: imports `src/helpers/jestUtils`
- `packages/nextclade-web/src/io/__tests__/parseGithubRepoUrl.test.ts`: imports `src/helpers/jestUtils`, calls `jest.resetModules()`
- `packages/nextclade-web/src/io/__tests__/parseGithubRepoUrlComponents.test.ts`: imports `src/helpers/jestUtils`
- `packages/nextclade-web/src/io/__tests__/getDatasetServerUrl.test.ts`: calls `jest.resetModules()`
- `packages/nextclade-web/src/helpers/__tests__/parseAminoacidChange.test.ts`: old field names
- `fn parseAminoacidChange()` in `packages/nextclade-web/src/helpers/parseAminoacidChange.ts`

## Fix

- Replace `getTestName` with the parameterized test names of vitest (`it.each` with `$`-placeholders), or restore the helper
- Replace `jest.resetModules()` with `vi.resetModules()`
- Update the expected values of `parseAminoacidChange.test.ts` to the `AaSub` field names, and confirm that `codon` maps to `pos` with the same 0-based value
