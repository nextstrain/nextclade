# Tree sidebar section subtitles run under the sidebar scrollbar

## Problem

The section subtitles of the Auspice sidebar on the tree page have a fixed width equal to the sidebar width (260px). When the sidebar content is taller than the page and the sidebar shows a vertical scrollbar that takes layout space, the visible sidebar width is 245px, and the right 15px of each subtitle are hidden under the scrollbar. Measured at 1024x600 with the SARS-CoV-2 example.

## Code

- Sidebar scroll container: `const Sidebar` in `packages/nextclade-web/src/components/Layout/SidebarLayout.tsx`
- Subtitles: Auspice `SidebarSubtitle` styled component, which takes its width from the sidebar width in the Auspice sidebar theme

## Fix

Give the subtitles the width of their container instead of the fixed sidebar width, or reserve the scrollbar width in the sidebar.
