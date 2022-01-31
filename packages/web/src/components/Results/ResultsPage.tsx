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
import { COLUMN_WIDTHS, DYNAMIC_COLUMN_WIDTH } from './ResultsTableStyle'

export const Container = styled.div<{ $minWidth: number }>`
  width: 100%;
  height: 100%;
  min-width: ${(props) => props.$minWidth}px;
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

  const { totalWidth, columnWidthsPx, dynamicColumnWidthPx, geneMapNameWidthPx } = useMemo(() => {
    const columnWidthsPx = Object.fromEntries(
      Object.entries(COLUMN_WIDTHS).map(([item, fb]) => [item, `${fb}px`]),
    ) as Record<keyof typeof COLUMN_WIDTHS, string>

    const dynamicColumnWidthPx = `${DYNAMIC_COLUMN_WIDTH}px`
    const dynamicColumnsWidthTotal = cladeNodeAttrKeys.length * DYNAMIC_COLUMN_WIDTH

    const totalWidth = sum(Object.values(COLUMN_WIDTHS)) + dynamicColumnsWidthTotal

    const geneMapNameWidth = totalWidth - COLUMN_WIDTHS.sequenceView
    const geneMapNameWidthPx = `${geneMapNameWidth}px`

    return {
      totalWidth,
      columnWidthsPx,
      dynamicColumnWidthPx,
      geneMapNameWidthPx,
    }
  }, [cladeNodeAttrKeys])

  return (
    <LayoutResults>
      <Container $minWidth={totalWidth}>
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
          <GeneMapTable geneMapNameWidthPx={geneMapNameWidthPx} columnWidthsPx={columnWidthsPx} />
        </Footer>
      </Container>
    </LayoutResults>
  )
}
