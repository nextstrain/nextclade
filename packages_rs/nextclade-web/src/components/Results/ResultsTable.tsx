import React, { ForwardedRef, forwardRef, ReactNode, Suspense, useCallback, useMemo, useState, memo } from 'react'
import styled from 'styled-components'
import {
  Row as ReactTableRow,
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnOrderState,
} from '@tanstack/react-table'
import { areEqual, FixedSizeList as FixedSizeListBase, ListChildComponentProps } from 'react-window'
import AutoSizerBase from 'react-virtualized-auto-sizer'
import copy from 'fast-copy'
import { useRecoilValue } from 'recoil'

import type { AnalysisResult, NextcladeResult } from 'src/types'
import { analysisResultsAtom } from 'src/state/results.state'
import { getColumnDefNames } from 'src/components/Table/helpers'
import { TableRow } from 'src/components/Table/TableRow'
import { ROW_HEIGHT, Table, TableMain, Trh } from 'src/components/Table/TableStyles'
import { TableColumnHeader } from 'src/components/Table/TableColumnHeader'
import { ColumnQCStatus } from 'src/components/Results/ColumnQCStatus'
import { SequenceView } from 'src/components/SequenceView/SequenceView'
import { ColumnNonACGTNs } from 'src/components/Results/ColumnNonACGTNs'
import { ColumnMutations } from 'src/components/Results/ColumnMutations'
import { ColumnGaps } from 'src/components/Results/ColumnGaps'
import { ColumnInsertions } from 'src/components/Results/ColumnInsertions'
import { ColumnStopCodons } from 'src/components/Results/ColumnStopCodons'
import { ColumnFrameShifts } from 'src/components/Results/ColumnFrameShifts'
import { ColumnMissing } from 'src/components/Results/ColumnMissing'
import { ColumnCoverage } from 'src/components/Results/ColumnCoverage'
import { ColumnClade } from 'src/components/Results/ColumnClade'
import { ColumnListDropdown } from 'src/components/Table/TableColumnList'
import { GeneMapTable } from 'src/components/GeneMap/GeneMapTable'

const TABLE_COLUMNS: ColumnDef<NextcladeResult>[] = [
  {
    id: 'ID',
    header: 'ID',
    accessorFn: (res) => res.index,
    size: 45,
  },
  {
    id: 'Strain',
    header: 'Strain',
    accessorFn: (res) => res.seqName,
    size: 250,
  },
  {
    id: 'QC',
    header: 'QC',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnQCStatus analysisResult={context.getValue<AnalysisResult>()} />,
    size: 130,
  },
  {
    id: 'Clade',
    header: 'Clade',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnClade analysisResult={context.getValue<AnalysisResult>()} />,
    size: 110,
  },
  {
    id: 'Cov',
    header: 'Cov',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnCoverage analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'Mut',
    header: 'Mut',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnMutations analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'Gaps',
    header: 'Gaps',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnGaps analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'Ns',
    header: 'Ns',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnMissing analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'Ambig',
    header: 'Ambig',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnNonACGTNs analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'Ins',
    header: 'Ins',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnInsertions analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'FS',
    header: 'FS',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnFrameShifts analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'SC',
    header: 'SC',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <ColumnStopCodons analysisResult={context.getValue<AnalysisResult>()} />,
    size: 50,
  },
  {
    id: 'Sequence View',
    header: 'Sequence View',
    accessorFn: (res) => res.result?.analysisResult,
    cell: (context) => <SequenceView sequence={context.getValue<AnalysisResult>()} />,
    enableSorting: false,
    meta: {
      fullWidth: true,
    },
  },
]

const TABLE_COLUMN_ORDER = getColumnDefNames(TABLE_COLUMNS)

const AutoSizer = styled(AutoSizerBase)`
  flex: 1 0 100%;
`

const FixedSizeList = styled(FixedSizeListBase)`
  overflow-y: scroll;
`

const Flex = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`

const FlexRow = styled.div`
  flex: 0;
`

const FlexRowFull = styled.div`
  flex: 1;
`

export function ResultsTable() {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(() => TABLE_COLUMNS, [])

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => copy(TABLE_COLUMN_ORDER))
  const [columnVisibility, setColumnVisibility] = useState({})

  const initialData =
    // getData()
    useRecoilValue(analysisResultsAtom)

  // const [initialData, setInitialData] = useState(data)

  const onRowReorder = useCallback((srcRowIndex: number, dstRowIndex: number) => {
    // setInitialData(reorder(data, srcRowIndex, dstRowIndex))
  }, [])

  const table = useReactTable({
    data: initialData,
    columns,
    state: { columnOrder, columnVisibility, sorting },
    columnResizeMode: 'onEnd',
    enableSorting: true,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const { rows } = table.getRowModel()
  const rowData = rows.map((row) => ({ row, onRowReorder }))

  const headerComponents = table.getHeaderGroups().map((headerGroup) => (
    <Trh key={headerGroup.id}>
      {headerGroup.headers.map((header) => (
        <TableColumnHeader<NextcladeResult> key={header.id} header={header} table={table} />
      ))}
    </Trh>
  ))

  const innerElementType = useMemo(
    () =>
      forwardRef(function FixedSizeListInnerElement(
        { children, ...rest }: { children: ReactNode },
        ref: ForwardedRef<HTMLDivElement>,
      ) {
        return (
          <Table ref={ref} {...rest}>
            {headerComponents}
            <TableMain>{children}</TableMain>
          </Table>
        )
      }),
    [headerComponents],
  )

  return (
    <Flex>
      <FlexRow>
        <ColumnListDropdown table={table} initialColumnOrder={TABLE_COLUMN_ORDER} />
      </FlexRow>
      <FlexRowFull>
        <AutoSizer>
          {({ width, height }) => (
            <FixedSizeList
              overscanCount={5}
              width={width}
              height={height}
              itemSize={ROW_HEIGHT}
              itemCount={rowData.length}
              innerElementType={innerElementType}
              itemData={rowData}
            >
              {ResultsTableRow}
            </FixedSizeList>
          )}
        </AutoSizer>
      </FlexRowFull>
      <FlexRow>
        <Suspense fallback={null}>
          <GeneMapTable />
        </Suspense>
      </FlexRow>
    </Flex>
  )
}

export interface ResultsTableRowDatum {
  row: ReactTableRow<NextcladeResult>
  onRowReorder: (srcRowIndex: number, dstRowIndex: number) => void
}

const ResultsTableRow = memo(ResultsTableRowUnmemoed, areEqual)

function ResultsTableRowUnmemoed({ index, data, style }: ListChildComponentProps<ResultsTableRowDatum[]>) {
  const { row, onRowReorder } = data[index]
  const rowId = row.original.index
  return <TableRow<NextcladeResult> key={rowId} rowIndex={index} style={style} row={row} onRowReorder={onRowReorder} />
}
