import React from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'
import { rgba } from 'polished'
import { BsArrowReturnLeft } from 'react-icons/bs'

import type { State } from 'src/state/reducer'
import { setViewedGene } from 'src/state/ui/ui.actions'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { GeneMap, GENE_MAP_HEIGHT_PX } from 'src/components/GeneMap/GeneMap'
import { GeneMapAxis } from 'src/components/GeneMap/GeneMapAxis'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { ButtonHelpSimple } from 'src/components/Results/ButtonHelp'
import HelpTipsGeneMap from 'src/components/Results/HelpTips/HelpTipsGeneMap.mdx'
import { Table, TableCell, TableCellName, TableRow } from 'src/components/Results/ResultsTableStyle'

export const GeneMapTableContent = styled(Table)`
  overflow-y: scroll;
  box-shadow: 1px -2px 2px 2px ${rgba('#212529', 0.25)};
`

export const GeneMapTableRow = styled(TableRow)`
  height: ${GENE_MAP_HEIGHT_PX}px;
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

export interface GeneMapTableProps {
  geneMapNameWidthPx: string
  columnWidthsPx: Record<string, string>
  isInNucleotideView: boolean

  switchToNucleotideView(): void
}

const mapStateToProps = (state: State) => ({
  isInNucleotideView: state.ui.viewedGene === GENE_OPTION_NUC_SEQUENCE,
})

const mapDispatchToProps = {
  switchToNucleotideView: () => setViewedGene(GENE_OPTION_NUC_SEQUENCE),
}

export const GeneMapTable = connect(mapStateToProps, mapDispatchToProps)(GeneMapTableDisconnected)

export const GeneMapTableCell = styled(TableCellName)``

export function GeneMapTableDisconnected({
  geneMapNameWidthPx,
  columnWidthsPx,
  isInNucleotideView,
  switchToNucleotideView,
}: GeneMapTableProps) {
  const { t } = useTranslationSafe()

  return (
    <GeneMapTableContent>
      <GeneMapTableRow>
        <GeneMapTableCell basis={geneMapNameWidthPx} grow={0} shrink={0}>
          <div className="mx-auto">
            <span className="ml-auto mr-2">{t('Genome annotation')}</span>
            <ButtonHelpSimple identifier="btn-help-gene-map" tooltipPlacement="auto">
              <HelpTipsGeneMap />
            </ButtonHelpSimple>
          </div>

          {!isInNucleotideView && (
            <GeneMapBackButton
              color="transparent"
              onClick={switchToNucleotideView}
              title={t('Return to full Genome annotation and nucleotide sequence view')}
            >
              <BsArrowReturnLeft size={20} />
            </GeneMapBackButton>
          )}
        </GeneMapTableCell>
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
