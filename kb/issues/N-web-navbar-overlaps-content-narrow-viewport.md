# Navigation bar overlaps the page on narrow screens

## Problem

The navigation bar and its header are fixed at 45 px. On narrow windows, the breadcrumbs (Start, Dataset, Results, Tree, Export), the status bar and the links do not fit in one row. At 390 px (a phone), the breadcrumbs wrap into a second row that covers the top of the page, for example the tree buttons on the tree page, and the language switcher and the menu button overlap the page content. At 768 px, the menu button sits over the top of the tree page sidebar.

## Code

- Header height: [Layout/Layout.tsx#L19-L22](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade-web/src/components/Layout/Layout.tsx#L19-L22)
- Navigation bar height: [Layout/NavigationBar.tsx#L27-L33](https://github.com/nextstrain/nextclade/blob/d415f3c396fabc7f792c676d60ac9b50236830c1/packages/nextclade-web/src/components/Layout/NavigationBar.tsx#L27-L33)

## Fix

Fit the navigation bar into one row on narrow screens, for example by moving the breadcrumbs and links into the menu below a width, or let the header take the height of the wrapped navigation bar so that it pushes the page down instead of covering it.
