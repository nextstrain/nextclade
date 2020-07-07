import React from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'
import { goBack } from 'connected-next-router'

import type { State } from 'src/state/reducer'
import type { AlgorithmParams } from 'src/state/algorithm/algorithm.state'
import { setInput } from 'src/state/algorithm/algorithm.actions'

import { ButtonBack } from './ButtonBack'
import { ButtonExport } from './ButtonExport'
import { ResultsTable, Table, TableCell, TableCellText, TableRow, TableCellName } from './ResultsTable'

import { FAKE_DATA } from './FAKE_DATA'
import { GeneMap } from 'src/components/GeneMap/GeneMap'
import { useTranslation } from 'react-i18next'
import { GeneMapTable } from 'src/components/GeneMap/GeneMapTable'

export const LayoutContainer = styled.div`
  width: 100%;
  height: 100%;
  min-width: 740px;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const Header = styled.header`
  flex-shrink: 0;
`

const MainContent = styled.main`
  flex-grow: 1;
  overflow: auto;
  min-height: 2em;
`

const Footer = styled.footer`
  flex-shrink: 0;
`

export interface MainProps {
  params: AlgorithmParams
  setInput(input: string): void
  exportTrigger(_0?: unknown): void
  goBack(): void
}

const mapStateToProps = (state: State) => ({
  params: state.algorithm.params,
})

const mapDispatchToProps = {
  setInput,
  goBack: () => goBack(),
}

export const ResultsPage = connect(mapStateToProps, mapDispatchToProps)(ResultsPageDisconnected)

export function ResultsPageDisconnected({ params, setInput, goBack }: MainProps) {
  const { t } = useTranslation()

  return (
    <LayoutContainer>
      <Header>
        <ButtonBack />
        <ButtonExport />
      </Header>

      <MainContent>
        <ResultsTable result={FAKE_DATA} />
      </MainContent>

      <Footer>
        <GeneMapTable />
      </Footer>
    </LayoutContainer>
  )
}
