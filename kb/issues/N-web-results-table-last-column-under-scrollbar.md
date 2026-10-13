# Results table hides the right edge of its last column under the scrollbar

## Problem

The results table rows and header row are as wide as the table, but the row list and the header row always show a vertical scrollbar. Where scrollbars take layout space (desktop browsers with classic scrollbars), the scrollbar covers the right 15px of the last column, which is the sequence view. The table scrolls sideways as a whole, so this part of the sequence view is never visible. Overlay scrollbars (phones, macOS default) are not affected.

Measured at a 1366x650 viewport with the SARS-CoV-2 example: the last cell ends at 1710px, the visible width of the row list ends at 1695px.

## Code

- Row list always scrolls vertically and hides horizontal overflow: [Results/ResultsTable.tsx#L62-L68](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade-web/src/components/Results/ResultsTable.tsx#L62-L68)
- Header row does the same, to keep its columns aligned with the rows: [Results/ResultsTableStyle.tsx#L50-L57](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade-web/src/components/Results/ResultsTableStyle.tsx#L50-L57)

## Fix

Subtract the scrollbar width from the width available to the columns, or make the sequence view column fill the visible width of the row list instead of the table width.
