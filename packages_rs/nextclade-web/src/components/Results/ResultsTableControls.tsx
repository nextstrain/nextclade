import React from 'react'
import styled from 'styled-components'
import { Table as ReactTable } from '@tanstack/react-table'

import { ButtonBack } from 'src/components/Results/ButtonBack'
import { ResultsStatus } from 'src/components/Results/ResultsStatus'
import { ButtonRerun } from 'src/components/Results/ButtonRerun'
import { ButtonNewRun } from 'src/components/Results/ButtonNewRun'
import { ButtonFilter } from 'src/components/Results/ButtonFilter'
import { ExportDialogButton } from 'src/components/Results/ExportDialogButton'
import { ButtonTree } from 'src/components/Results/ButtonTree'
import { ColumnListDropdown } from 'src/components/Table/TableColumnList'

const HeaderLeft = styled.header`
  flex: 0;
`

const HeaderCenter = styled.header`
  flex: 1;
  padding: 5px 10px;
  border-radius: 5px;
`

const HeaderRight = styled.header`
  flex: 0;
  display: flex;
`

const HeaderRightContainer = styled.div`
  flex: 0;
`

export interface ResultsTableControlsProps<T> {
  table: ReactTable<T>
  initialColumnOrder: string[]
}

export function ResultsTableControls<T>({ table, initialColumnOrder }: ResultsTableControlsProps<T>) {
  return (
    <>
      <HeaderLeft>
        <ButtonBack />
      </HeaderLeft>
      <HeaderCenter>
        <ResultsStatus />
      </HeaderCenter>
      <HeaderRight>
        <HeaderRightContainer>
          <ButtonRerun />
        </HeaderRightContainer>
        <HeaderRightContainer>
          <ButtonNewRun />
        </HeaderRightContainer>
        <HeaderRightContainer>
          <ButtonFilter />
        </HeaderRightContainer>
        <HeaderRightContainer>
          <ExportDialogButton />
        </HeaderRightContainer>
        <HeaderRightContainer>
          <ButtonTree />
        </HeaderRightContainer>
        <HeaderRightContainer>
          <ColumnListDropdown table={table} initialColumnOrder={initialColumnOrder} />
        </HeaderRightContainer>
      </HeaderRight>
    </>
  )
}
