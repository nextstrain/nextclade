import React, { useMemo } from 'react'

import { sum } from 'lodash'
import styled from 'styled-components'
import { useSelector } from 'react-redux'

import { selectCladeNodeAttrKeys } from 'src/state/algorithm/algorithm.selectors'
import { LayoutResults } from 'src/components/Layout/LayoutResults'
import { GeneMapTable } from 'src/components/GeneMap/GeneMapTable'
import { ExportDialogButton } from 'src/components/Results/ExportDialogButton'
import { ButtonNewRun } from 'src/components/Results/ButtonNewRun'
import { ButtonBack } from './ButtonBack'
import { ButtonFilter } from './ButtonFilter'
import { ButtonTree } from './ButtonTree'
import { ResultsStatus } from './ResultsStatus'
import { ResultsFilter } from './ResultsFilter'
import { ResultsTable } from './ResultsTable'
import { ButtonRerun } from './ButtonRerun'
import { COLUMN_WIDTHS } from './ResultsTableStyle'

export const Container = styled.div`
  width: 100%;
  height: 100%;
  min-width: 1650px;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
`

const Header = styled.header`
  flex-shrink: 0;
  display: flex;
`

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

const MainContent = styled.main`
  flex: 1;
  flex-basis: 100%;
  overflow: auto;
  border: none;
`

const Footer = styled.footer`
  flex-shrink: 0;
`

export function ResultsPage() {
  const cladeNodeAttrKeys = useSelector(selectCladeNodeAttrKeys)

  const { columnWidthsPx, dynamicColumnWidthPx, geneMapNameWidthPx } = useMemo(() => {
    const columnWidthsPx = Object.fromEntries(
      Object.entries(COLUMN_WIDTHS).map(([item, fb]) => [item, `${fb}px`]),
    ) as Record<keyof typeof COLUMN_WIDTHS, string>

    const dynamicColumnWidth = 100
    const dynamicColumnWidthPx = `${dynamicColumnWidth}px`

    const dynamicColumnsWidth = cladeNodeAttrKeys.length * dynamicColumnWidth

    const geneMapNamewidth = sum(Object.values(COLUMN_WIDTHS)) + dynamicColumnsWidth
    const geneMapNameWidthPx = `${geneMapNamewidth}px`

    return {
      columnWidthsPx,
      dynamicColumnWidthPx,
      geneMapNameWidthPx,
    }
  }, [cladeNodeAttrKeys])

  return (
    <LayoutResults>
      <Container>
        <Header>
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
          </HeaderRight>
        </Header>

        <ResultsFilter />

        <MainContent>
          <ResultsTable
            columnWidthsPx={columnWidthsPx}
            dynamicColumnWidthPx={dynamicColumnWidthPx}
            cladeNodeAttrKeys={cladeNodeAttrKeys}
          />
        </MainContent>

        <Footer>
          <GeneMapTable geneMapNameWidthPx={geneMapNameWidthPx} />
        </Footer>
      </Container>
    </LayoutResults>
  )
}
