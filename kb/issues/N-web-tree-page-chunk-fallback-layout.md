# Tree page shows a full-page logo while its code loads

## Problem

The tree page content is a lazily loaded module. While the module loads, the page shows the large animated Nextclade logo over the full page, without the sidebar. Then the page changes to its own loading state with the sidebar placeholder, so the layout jumps. The delay is noticeable in development and on the first visit over a slow connection.

## Code

- Suspense fallback: [src/components/Tree/TreePage.tsx#L16](https://github.com/nextstrain/nextclade/blob/55a98ae70aa910561b6801cdc2bf4c998abb70af/packages/nextclade-web/src/components/Tree/TreePage.tsx#L16)

## Fix

Use a fallback with the same sidebar layout as the tree page loading state. The sidebar placeholder must then live in a module that does not import Auspice, so that the fallback does not need the lazily loaded code.
