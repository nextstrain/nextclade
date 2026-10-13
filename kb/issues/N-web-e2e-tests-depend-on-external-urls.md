# End-to-end tests fail or flake on external input URLs

## Problem

Several URL parameter tests load inputs from external or placeholder addresses (`https://example.com/...`, GitHub shortcuts) and then expect no error in the UI. On a development server, with one worker, these fail on the base branch as well:

- `combined-parameters.spec.ts`: "should handle dataset with tag + multiple input files"
- `edge-cases.spec.ts`: "should handle multiple slashes in URLs"
- `github-shortcuts.spec.ts`: "should handle multiple GitHub shortcuts together"

`edge-cases.spec.ts` "should handle URL with query parameters" passes or fails from run to run: the fetch of `https://example.com/file.fasta` fails, and the test passes only when it checks for errors before the failure shows. With the default number of workers (75 % of the CPUs), many more tests time out on page navigation while the development server compiles pages on demand. The failing manual dataset selection test is in [N-web-e2e-dataset-persistence-manual-selection.md](N-web-e2e-dataset-persistence-manual-selection.md).

## Code

- Example: [tests/e2e/edge-cases.spec.ts#L25-L37](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade-web/tests/e2e/edge-cases.spec.ts#L25-L37)

## Fix

Serve the input files of these tests from a local test server or from Playwright route mocks, and wait for the outcome of the input fetch before asserting the absence of errors.
