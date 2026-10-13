# Entropy chart title runs under its buttons on narrow screens

## Problem

The entropy chart card shows its title and, at the right end of the same row, the "Reset layout", "Entropy" and "Events" buttons and an info icon. On a phone (390 px), the buttons cover the end of the title.

## Code

- Title row height: [Tree/Tree.tsx#L125-L132](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade-web/src/components/Tree/Tree.tsx#L125-L132)

## Fix

Measure the buttons of the entropy card, as the tree page does for the tree zoom buttons, and cut the title with an ellipsis before them, or move the buttons to a row of their own on narrow screens.
