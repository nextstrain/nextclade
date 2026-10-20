# Proposal: Replace react-window with LegendList on the results page

## Motivation

The results page uses `react-window` (`FixedSizeList`) with `react-virtualized-auto-sizer` for virtualized rendering of analysis results. `react-window` is unmaintained (last publish 2020, last commit 2021). `@legendapp/list` v3 provides a modern DOM-native virtualization library with active maintenance, DOM node recycling, and a simpler API that removes the need for an external auto-sizer.

Repository: https://github.com/LegendApp/legend-list
Documentation (web): https://legendapp.com/open-source/list/v3/react/getting-started
API reference: https://legendapp.com/open-source/list/v3/api

## Target library

`@legendapp/list` v3 (npm tag: `beta`, package: `@legendapp/list@^3.0.0-beta.49`).

v3 introduces a dedicated web/DOM entrypoint at `@legendapp/list/react`:

- Depends only on `react` (no `react-native` peer dependency)
- Renders standard `<div>` elements
- Manages its own scroll container
- Supports DOM node recycling via `recycleItems` prop

v2 (`latest` tag as of 2026-05-02) requires `react-native` as a peer dependency and has no web-specific entrypoint. v2 is not suitable.

## Scope

Replace `react-window` + `react-virtualized-auto-sizer` in the results page list components. Both the main results table (`ResultsTable`) and the unclassified sequences table (`ResultsTableUnknownDataset`) use the same pattern and both need migration.

Out of scope: `Tree.tsx` uses `react-virtualized-auto-sizer` (not `react-window`) for measuring available space for Auspice SVG rendering. That is not a list virtualization use case and does not need migration. `react-virtualized-auto-sizer` stays as a dependency.

## Current architecture

### Dependencies (`packages/nextclade-web/package.json`)

```
"react-virtualized-auto-sizer": "1.0.26"
"react-window": "1.8.11"
"@types/react-window": "1.8.8"
```

### Files using react-window

All paths relative to `packages/nextclade-web/`.

| File                                                       | Usage                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `src/components/Results/ResultsTable.tsx`                  | `FixedSizeList` + `AutoSizer` for main results list           |
| `src/components/Results/ResultsTableRow.tsx`               | `ListChildComponentProps`, `areEqual` from react-window       |
| `src/components/Results/ResultsTableUnknownDataset.tsx`    | `FixedSizeList` + `AutoSizer` for unclassified sequences list |
| `src/components/Results/ResultsTableUnknownDatasetRow.tsx` | `ListChildComponentProps`, `areEqual` from react-window       |

### Files using only react-virtualized-auto-sizer

| File                           | Usage                                                     |
| ------------------------------ | --------------------------------------------------------- |
| `src/components/Tree/Tree.tsx` | `AutoSizer` to measure space for Auspice tree/entropy SVG |

### react-window rendering model

`FixedSizeList` positions items absolutely within its scroll container. It passes `ListChildComponentProps` to each row component:

```typescript
interface ListChildComponentProps<T = any> {
  index: number;
  style: CSSProperties; // absolute positioning: top, height, position, left, width
  data: T; // itemData array passed to FixedSizeList
  isScrolling?: boolean;
}
```

The `style` prop provides absolute positioning. Each row component spreads `...restProps` (containing `style`) onto its root styled component.

### Row component data flow

1. `ResultsTable.tsx` builds `rowData: TableRowDatum[]` with per-row configuration (seqIndex, viewedGene, column widths, dynamic column descriptors)
2. `FixedSizeList` receives `itemData={rowData}` and `children={ResultsTableRow}`
3. `ResultsTableRow` receives `{ index, data, style }` where `data` is the full array
4. `data[index]` extracts the specific datum via `useMemo`
5. `...restProps` (containing `style`) flows through to `ResultsTableRowResult` / `ResultsTableRowError` / `ResultsTableRowPending`
6. Sub-components spread `...restProps` onto root styled components (`TableRowColored`, `TableRowError`, `TableRowPending`)

### Container sizing

```
<Table>                          <!-- height: 100%, overflow: hidden, NOT a flex container -->
  <TableHeaderRow>               <!-- fixed height: 90px (HEADER_ROW_HEIGHT) -->
  <AutoSizer>                    <!-- measures remaining space -->
    {({ width, height }) =>
      <FixedSizeList
        width={width}
        height={height - HEADER_ROW_HEIGHT}
        itemSize={30}            <!-- ROW_HEIGHT -->
      />
    }
  </AutoSizer>
</Table>
```

`Table` (`ResultsTableStyle.tsx`) has `height: 100%; overflow: hidden` but is NOT a flex container. `AutoSizer` handles the remaining-space calculation.

### Memo comparison

`ResultsTableRow` and `ResultsTableUnknownDatasetRow` use `areEqual` from react-window as `React.memo` comparator. This performs shallow equality on `ListChildComponentProps` fields.

## LegendList v3 API (`@legendapp/list/react`)

### Key props

| Prop                    | Type                                                    | Description                                          |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `data`                  | `ReadonlyArray<T>`                                      | Items to render                                      |
| `renderItem`            | `({ item, index, data, extraData, type }) => ReactNode` | Render function per item                             |
| `keyExtractor`          | `(item: T, index: number) => string`                    | Unique key per item                                  |
| `estimatedItemSize`     | `number`                                                | Pixel height hint for scroll math before measurement |
| `recycleItems`          | `boolean`                                               | Enable DOM node recycling                            |
| `drawDistance`          | `number`                                                | Pixels to pre-render beyond viewport (default: 250)  |
| `style`                 | `CSSProperties`                                         | Applied to scroll container                          |
| `contentContainerStyle` | `CSSProperties`                                         | Applied to inner content wrapper                     |

### Rendering model

LegendList renders items in DOM flow (not absolute positioned). Each item sits inside a managed container `<div>`. The `renderItem` callback receives `{ item, index }` where `item` is the individual datum. No `style` prop is injected into rendered items.

### Container requirements

The scroll container must have a height:

- Fixed pixel height: `style={{ height: N }}`
- Flex child: `style={{ flex: 1, minHeight: 0 }}` inside a flex parent with known height

## API migration mapping

| react-window                          | LegendList                                                         |
| ------------------------------------- | ------------------------------------------------------------------ |
| `FixedSizeList`                       | `LegendList`                                                       |
| `AutoSizer` wrapper                   | Remove (LegendList fills its flex parent)                          |
| `itemSize={30}`                       | `estimatedItemSize={30}`                                           |
| `itemCount={N}`                       | Derived from `data.length`                                         |
| `itemData={arr}`                      | `data={arr}`                                                       |
| `overscanCount={10}`                  | `drawDistance={300}` (10 rows \* 30px)                             |
| `width={w}` from AutoSizer            | CSS `width: 100%`                                                  |
| `height={h - 90}` from AutoSizer      | `style={{ flex: 1, minHeight: 0 }}` in flex parent                 |
| `children={RowComponent}`             | `renderItem={({ item, index }) => ...}`                            |
| `ListChildComponentProps.style`       | Removed (list positions items internally)                          |
| `ListChildComponentProps.data[index]` | `renderItem` receives `item` directly                              |
| `areEqual` comparator                 | Remove (LegendList manages recycling; plain `React.memo` suffices) |
| `style={{ overflowY: 'scroll' }}`     | Remove (LegendList manages scrolling)                              |

## Implementation plan

### 1. Install dependency

Add `@legendapp/list` (v3 beta) to `packages/nextclade-web/package.json`. Install via `./docker/dev bun install`.

### 2. Refactor `ResultsTableRow.tsx`

Change the props interface from extending `ListChildComponentProps` (receives full array + index + style) to a flat interface receiving `{ item: TableRowDatum, index: number }`. Remove `react-window` import, `areEqual` comparator, `useMemo(() => data[index])`, and `...restProps` spreading.

### 3. Refactor row sub-components

Remove `...restProps` from `ResultsTableRowResult.tsx`, `ResultsTableRowError.tsx`, `ResultsTableRowPending.tsx`. Each currently accepts and spreads `...restProps` (carrying react-window's absolute positioning `style`) onto their root styled component.

### 4. Refactor `ResultsTable.tsx`

Remove `react-window` and `react-virtualized-auto-sizer` imports and styled wrappers. Replace the `<AutoSizer>` + `<FixedSizeList>` render tree with:

```tsx
<LegendList data={rowData} renderItem={({ item, index }) => <ResultsTableRow item={item} index={index} />} keyExtractor={(item) => String(item.seqIndex)} estimatedItemSize={ROW_HEIGHT} recycleItems drawDistance={300} style={{ flex: 1, minHeight: 0, overflowX: "hidden" }} />
```

### 5. Make `Table` a flex column

Add `display: flex; flex-direction: column` to the `Table` styled component in `ResultsTableStyle.tsx`. This allows LegendList to use `flex: 1` to fill remaining height after the header row.

### 6. Refactor `ResultsTableUnknownDatasetRow.tsx`

Same pattern as step 2.

### 7. Refactor `ResultsTableUnknownDataset.tsx`

Same pattern as step 4.

### 8. Remove react-window from dependencies

Remove `react-window` and `@types/react-window` from `package.json`. Keep `react-virtualized-auto-sizer` (used by `Tree.tsx`).

### 9. Validate

```bash
./docker/dev bun install
./docker/dev al          # eslint + tsc
```

### 10. Manual verification

Run analysis (`?dataset-name=sars-cov-2&input-fasta=example`) and verify: table renders, scrolling works, row coloring displays, sorting works, sequence views render, dynamic columns appear, filter panel collapse/expand works.

## Risks

### R1: Beta stability

v3 is beta. Pin to exact version. The change is isolated to ~10 files and fully reversible.

### R2: Row height measurement

react-window enforces exact pixel height via `itemSize`. LegendList uses `estimatedItemSize` as a hint and measures actual DOM height. If rows render at heights other than `ROW_HEIGHT` (30px), scroll position calculations will diverge. Rows use fixed heights via flex layout, so actual height should match.

### R3: Recycling with stateful rows

`recycleItems` recycles DOM nodes. If row components hold local state, recycling causes state bleed. Current row components are stateless (all state in jotai atoms / recoil). If stateful rows are added later, use `useRecyclingState` or `useRecyclingEffect` hooks.

### R4: `Table` layout change

Adding `display: flex; flex-direction: column` to `Table` could affect `TableHeaderRow` rendering. `TableHeaderRow` has explicit `height: 90px` and `display: flex`, so it should be unaffected. Verify visually.

## Open questions

- **Q1: Horizontal scroll synchronization.** `FixedSizeList` has `overflow-x: hidden !important` via styled component override. Horizontal scrolling is handled at the `WrapperOuter` parent level. Verify LegendList's scroll container does not interfere.

- **Q2: `TableHeaderRow` scrollbar alignment.** `TableHeaderRow` has `overflow-y: scroll` to reserve scrollbar width matching the list. With LegendList managing its own scroll container, verify scrollbar widths align.

- **Q3: `recycleItems` with `Suspense`.** `ResultsTableRowResult` wraps `SequenceView`/`PeptideView` in `<Suspense fallback={null}>`. Verify recycled containers handle suspended content correctly.

## Affected files

All paths relative to `packages/nextclade-web/`.

| File                                                       | Change                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `package.json`                                             | Add `@legendapp/list`, remove `react-window` + `@types/react-window` |
| `bun.lock`                                                 | Regenerated                                                          |
| `src/components/Results/ResultsTable.tsx`                  | Replace AutoSizer + FixedSizeList with LegendList                    |
| `src/components/Results/ResultsTableRow.tsx`               | New props interface, remove react-window                             |
| `src/components/Results/ResultsTableRowResult.tsx`         | Remove `...restProps`                                                |
| `src/components/Results/ResultsTableRowError.tsx`          | Remove `...restProps`                                                |
| `src/components/Results/ResultsTableRowPending.tsx`        | Remove `...restProps`                                                |
| `src/components/Results/ResultsTableUnknownDataset.tsx`    | Replace AutoSizer + FixedSizeList with LegendList                    |
| `src/components/Results/ResultsTableUnknownDatasetRow.tsx` | New props interface, remove react-window                             |
| `src/components/Results/ResultsTableStyle.tsx`             | Add flex layout to `Table`                                           |
