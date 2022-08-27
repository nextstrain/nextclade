import React, { useMemo } from 'react'

import { useRecoilValue, useSetRecoilState } from 'recoil'
import { isInNucleotideViewAtom, switchToNucleotideViewAtom } from 'src/state/seqViewSettings.state'
import styled from 'styled-components'
import { rgba } from 'polished'
import { BsArrowReturnLeft } from 'react-icons/bs'

import { geneMapNameColumnWidthPxAtom, resultsTableColumnWidthsPxAtom } from 'src/state/settings.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { GeneMap } from 'src/components/GeneMap/GeneMap'
import { GeneMapAxis } from 'src/components/GeneMap/GeneMapAxis'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { ButtonHelpSimple } from 'src/components/Results/ButtonHelp'
import HelpTipsGeneMap from 'src/components/Results/HelpTips/HelpTipsGeneMap.mdx'
import { Table, TableCell, TableCellName, TableRow } from 'src/components/Results/ResultsTableStyle'

export const GeneMapTableContent = styled(Table)`
  overflow-y: scroll;
  box-shadow: 1px -2px 2px 2px ${rgba('#212529', 0.25)};
`

export const GeneMapTableRow = styled(TableRow)`
  background-color: #dadfe5;
`

export const GeneMapAxisTableRow = styled(TableRow)`
  height: 30px;
  background-color: #dadfe5;
`

export const GeneMapBackButton = styled(ButtonTransparent)`
  margin-right: 0.5rem;

  & svg {
    color: #555;
  }
`

export function GeneMapTable() {
  const { t } = useTranslationSafe()

  const isInNucleotideView = useRecoilValue(isInNucleotideViewAtom)
  const switchToNucleotideView = useSetRecoilState(switchToNucleotideViewAtom)
  const geneMapNameWidthPx = useRecoilValue(geneMapNameColumnWidthPxAtom)
  const columnWidthsPx = useRecoilValue(resultsTableColumnWidthsPxAtom)

  const returnButton = useMemo(() => {
    if (!isInNucleotideView) {
      return (
        <GeneMapBackButton
          color="transparent"
          onClick={switchToNucleotideView}
          title={t('Return to full Genome annotation and nucleotide sequence view')}
        >
          <BsArrowReturnLeft size={20} />
        </GeneMapBackButton>
      )
    }
    return null
  }, [isInNucleotideView, switchToNucleotideView, t])

  return (
    <GeneMapTableContent>
      <GeneMapTableRow>
        <TableCellName basis={geneMapNameWidthPx} grow={0} shrink={0}>
          <div className="mx-auto">
            <span className="ml-auto mr-2">{t('Genome annotation')}</span>
            <ButtonHelpSimple identifier="btn-help-gene-map" tooltipPlacement="auto">
              <HelpTipsGeneMap />
            </ButtonHelpSimple>
          </div>

          {returnButton}
        </TableCellName>
        <TableCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
          <GeneMap />
        </TableCell>
      </GeneMapTableRow>

      <GeneMapAxisTableRow>
        <TableCellName basis={geneMapNameWidthPx} grow={0} shrink={0} />
        <TableCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
          <GeneMapAxis />
        </TableCell>
      </GeneMapAxisTableRow>
    </GeneMapTableContent>
  )
}
