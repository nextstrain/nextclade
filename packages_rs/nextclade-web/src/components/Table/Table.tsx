import { get, isNil, isString, sortBy, toString } from 'lodash'
import React, { useCallback, useDeferredValue, useMemo, useRef, useState, HTMLProps } from 'react'
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowData,
} from '@tanstack/react-table'
import fuzzysort from 'fuzzysort'
import { StrictOmit } from 'ts-essentials'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Col, Row } from 'reactstrap'
import { getColumnDefName } from 'src/components/Table/helpers'
import { TableHeading } from 'src/components/Table/TableHeading'
import { TableRow } from 'src/components/Table/TableRow'
import { TableWrapper, TableContainer, TableStyled, Tbody, Thead, Tr } from 'src/components/Table/TableStyles'
import { TableColumnHeader } from './TableColumnHeader'
import { TableSpacer } from './TableSpacer'

export function sanitizeValue(value?: unknown) {
  if (isNil(value)) {
    return undefined
  }
  const s = toString(value).toLowerCase().trim()
  if (['', 'unknown', '?', 'n/a', 'nan', 'inf', 'null', 'undefined', 'none'].includes(s)) {
    return undefined
  }
  return value
}

function preprocessColumns<T extends RowData>(columnDefs: ColumnDef<T>[]): ColumnDef<T>[] {
  return columnDefs.map((col) => {
    const id = getColumnDefName(col)
    if (!id) {
      throw new Error('Either `header` or `id` required fro column def')
    }

    // HACK: ColumnDef type does not seem to have accessorKey and accessorFn, so here is a bit of hackery to extract them safely:
    const accessorKey = get(col, 'accessorKey') as string | undefined
    const accessorFnOrig = get(col, 'accessorFn') as ((val: unknown) => unknown) | undefined
    const accessorFn = (val: unknown) => sanitizeValue(get(val, accessorKey ?? '') ?? accessorFnOrig?.(val))

    return { ...col, sortUndefined: 1, id, accessorFn }
  })
}

export interface TableProps<T, I> extends StrictOmit<HTMLProps<HTMLDivElement>, 'children' | 'ref' | 'as'> {
  title?: string
  searchTitle?: string
  data_: T[]
  columns_: ColumnDef<T>[]
  initialColumnOrder: string[]
  searchKeys: Extract<keyof T, string>[]
  selectedRowId?: I
  setSelectedRowId?(id: I): void
  getRowId?(item: T): I
}

export function Table<T, I>({
  title,
  searchTitle,
  data_,
  columns_,
  initialColumnOrder,
  searchKeys,
  selectedRowId,
  setSelectedRowId,
  getRowId,
  ...restProps
}: TableProps<T, I>) {
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columns] = React.useState(preprocessColumns(columns_))

  const setSelectedRowIndexFun = useCallback((i: I) => () => setSelectedRowId?.(i), [setSelectedRowId])

  const [searchTerm, setSearchTerm] = useState('')
  const searchTermDeferred = useDeferredValue(searchTerm)
  const initialData = data_
  const data = useMemo(() => {
    const results = fuzzysort.go(searchTermDeferred, initialData, { keys: searchKeys, all: true }).map((result) => {
      // Increase relevance if any of the candidate's words start with any of the search terms or include one exactly
      const words = searchKeys
        .map((key) => get(result.obj, key) as unknown)
        .filter(isString)
        .flatMap((word) => word.split(' '))
        .map((word) => word.toLowerCase())

      if (words.length === 0) {
        return result
      }

      const searchTerms = searchTermDeferred.split(' ')
      if (searchTerms.some((searchTerm) => words[0].startsWith(searchTerm))) {
        return { ...result, score: result.score * 0.05 }
      }
      if (words.some((word) => searchTerms.some((searchTerm) => word.startsWith(searchTerm)))) {
        return { ...result, score: result.score * 0.1 }
      }
      if (words.some((word) => searchTerms.some((searchTerm) => word.includes(searchTerm)))) {
        return { ...result, score: result.score * 0.15 }
      }
      return result
    })

    const relevant = sortBy(results, (result) => -result.score).map((result) => result.obj)

    if (relevant.length < initialData.length) {
      setSorting([])
    }

    return [...relevant]
  }, [initialData, searchKeys, searchTermDeferred])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    columnResizeMode: 'onEnd',
    enableSorting: true,
    enableMultiSort: true,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rowModel = table.getRowModel()

  const { getVirtualItems, getTotalSize } = useVirtualizer({
    count: rowModel.rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35,
  })

  const virtualRows = getVirtualItems()

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
  const paddingBottom = virtualRows.length > 0 ? getTotalSize() - (virtualRows[virtualRows.length - 1]?.end || 0) : 0

  const headerComponents = table.getHeaderGroups().map((headerGroup) => (
    <Tr key={headerGroup.id}>
      {headerGroup.headers.map((header) => (
        <TableColumnHeader<T> key={header.id} header={header} table={table} />
      ))}
    </Tr>
  ))

  const rowComponents = virtualRows.map((virtualRow) => {
    const row = rowModel.rows[virtualRow.index]
    const rowId = getRowId?.(row.original)
    const isHighlighted = !isNil(rowId) && !isNil(selectedRowId) && rowId === selectedRowId
    const onClick = rowId && setSelectedRowIndexFun(rowId)
    return <TableRow<T> key={row.id} row={row} isHighlighted={isHighlighted} onClick={onClick} />
  })

  return (
    <TableWrapper>
      <Row noGutters>
        <Col>
          <TableHeading
            table={table}
            initialColumnOrder={initialColumnOrder}
            title={title}
            searchTitle={searchTitle}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
          />
        </Col>
      </Row>

      <Row noGutters className="mt-2">
        <TableContainer ref={tableContainerRef} {...restProps}>
          <TableStyled>
            <Thead>{headerComponents}</Thead>
            <Tbody>
              <TableSpacer height={paddingTop} />
              {rowComponents}
              <TableSpacer height={paddingBottom} />
            </Tbody>
          </TableStyled>
        </TableContainer>
      </Row>
    </TableWrapper>
  )
}
