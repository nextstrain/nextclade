# ESLint does not check the rules of hooks

## Problem

The web app's ESLint configuration registers the React hooks plugin but enables only its `exhaustive-deps` rule. The `rules-of-hooks` rule is off, so lint does not report a hook that runs only on some renders, for example after an early return. React requires the same hooks in the same order on every render and throws when the number of hooks changes between renders.

## Code

- Plugin registration: [eslint.config.mjs#L91](https://github.com/nextstrain/nextclade/blob/e070a6260d99396d76d9a58d0332426b9f78b2dc/packages/nextclade-web/eslint.config.mjs#L91)
- Only hooks rule enabled: [eslint.config.mjs#L200-L203](https://github.com/nextstrain/nextclade/blob/e070a6260d99396d76d9a58d0332426b9f78b2dc/packages/nextclade-web/eslint.config.mjs#L200-L203)

## Fix

Enable `react-hooks/rules-of-hooks` as an error and fix the code it reports.
