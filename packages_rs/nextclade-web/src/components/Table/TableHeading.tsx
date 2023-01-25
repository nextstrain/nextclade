import React from 'react'
import styled from 'styled-components'
import { Table as ReactTable } from '@tanstack/react-table'

import { SearchBox } from 'src/components/Common/SearchBox'
import { ColumnListDropdown } from 'src/components/Table/TableColumnList'

export const Flex = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
`

export const TitleWrapper = styled.div`
  flex: 1 1 60%;
  margin: auto 0;
`

export const SearchBoxWrapper = styled.div`
  flex: 1 0 40%;
`

export const MenuWrapper = styled.div`
  flex: 0;
`

export const TableTitle = styled.h3`
  padding: 0;
  margin: auto 0;
`

export interface TableHeadingProps<T> {
  table: ReactTable<T>
  initialColumnOrder: string[]
  title?: string
  searchTitle?: string
  searchTerm: string
  onSearchTermChange(term: string): void
}

export function TableHeading<T>({
  title,
  searchTitle,
  searchTerm,
  onSearchTermChange,
  table,
  initialColumnOrder,
}: TableHeadingProps<T>) {
  return (
    <Flex>
      {title && (
        <TitleWrapper>
          <TableTitle>{title}</TableTitle>
        </TitleWrapper>
      )}

      <SearchBoxWrapper>
        <SearchBox searchTitle={searchTitle} searchTerm={searchTerm} onSearchTermChange={onSearchTermChange} />
      </SearchBoxWrapper>

      <MenuWrapper>
        <ColumnListDropdown table={table} initialColumnOrder={initialColumnOrder} />
      </MenuWrapper>
    </Flex>
  )
}
