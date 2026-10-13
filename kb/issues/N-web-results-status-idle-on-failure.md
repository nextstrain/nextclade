# Results status says "Idle" when the analysis fails

## Problem

When the analysis fails, the status bar in the navigation bar reads "Idle. Failed due to error." The analysis did not go idle; it failed. The `failed` case sets only the failure text and keeps the default status text "Idle".

## Code

- Default status text: [src/components/Results/ResultsStatus.tsx#L120](https://github.com/nextstrain/nextclade/blob/55a98ae70aa910561b6801cdc2bf4c998abb70af/packages/nextclade-web/src/components/Results/ResultsStatus.tsx#L120)
- Failed case: [src/components/Results/ResultsStatus.tsx#L181-L186](https://github.com/nextstrain/nextclade/blob/55a98ae70aa910561b6801cdc2bf4c998abb70af/packages/nextclade-web/src/components/Results/ResultsStatus.tsx#L181-L186)

## Fix

Set a status text for the failed case, or show only the failure text.
