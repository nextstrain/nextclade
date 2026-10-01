# Export page scrolls inside its centered column

## Problem

The export page centers its content in a column of limited width, and the file list scrolls inside that column. The scrollbar is in the middle of the page instead of on the page edge, and the mouse wheel scrolls the list only while the pointer is over the column. The tree page scrolls in one area that fills the page content area, with its scrollbar on the page edge.

## Code

- Tab panes scroll: [Common/TabsFull.tsx#L56-L60](https://github.com/nextstrain/nextclade/blob/b2e95fc9da45a0beaf006645dc1386038ab797b4/packages/nextclade-web/src/components/Common/TabsFull.tsx#L56-L60)
- File list scrolls: [Export/ExportTabMain.tsx#L377-L380](https://github.com/nextstrain/nextclade/blob/b2e95fc9da45a0beaf006645dc1386038ab797b4/packages/nextclade-web/src/components/Export/ExportTabMain.tsx#L377-L380)
- Centered column: [Export/ExportPage.tsx#L156-L165](https://github.com/nextstrain/nextclade/blob/b2e95fc9da45a0beaf006645dc1386038ab797b4/packages/nextclade-web/src/components/Export/ExportPage.tsx#L156-L165)

## Fix

Scroll the whole page content area, and keep the centered column without its own scrolling. The column config tab has its own scroll areas, which must keep working when the page scrolls.
