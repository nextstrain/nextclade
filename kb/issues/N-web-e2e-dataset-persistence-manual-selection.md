# E2E test for manual dataset selection fails

## Problem

The test "should persist manually selected dataset from default server" fails on every run. After it clicks "Select reference dataset" and then "SARS-CoV-2", it waits for a "Change reference dataset" button, which does not appear within 10 seconds. It is not known yet whether the test or the app is wrong: the click may leave the user on the dataset selection page, where this button is not shown.

## Code

- Test: [tests/e2e/dataset-persistence.spec.ts#L263-L283](https://github.com/nextstrain/nextclade/blob/55a98ae70aa910561b6801cdc2bf4c998abb70af/packages/nextclade-web/tests/e2e/dataset-persistence.spec.ts#L263-L283)
- Wait for the button: [tests/e2e/helpers/url-parameters.ts#L57](https://github.com/nextstrain/nextclade/blob/55a98ae70aa910561b6801cdc2bf4c998abb70af/packages/nextclade-web/tests/e2e/helpers/url-parameters.ts#L57)

## Fix

Find which page the test is on after the click, then fix the test or the selection flow so that the selected dataset is shown with its "Change reference dataset" button.
