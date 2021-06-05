import React from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'
import { rgba } from 'polished'
import { BsArrowReturnLeft } from 'react-icons/bs'

import type { State } from 'src/state/reducer'
import { setViewedGene } from 'src/state/ui/ui.actions'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import {
  geneMapNameBasisPx,
  Table,
  TableCell,
  TableCellName,
  TableCellText,
  TableRow,
} from 'src/components/Results/ResultsTable'
import { GeneMap, GENE_MAP_HEIGHT_PX } from 'src/components/GeneMap/GeneMap'
import { GeneMapAxis } from 'src/components/GeneMap/GeneMapAxis'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'

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

export function GeneMapTableDisconnected({ isInNucleotideView, switchToNucleotideView }: GeneMapTableProps) {
  const { t } = useTranslationSafe()

  return (
    <GeneMapTableContent>
      <GeneMapTableRow>
        <TableCellName basis={geneMapNameBasisPx} shrink={0}>
          <TableCellText>{t('Genome annotation')}</TableCellText>
          {!isInNucleotideView && (
            <GeneMapBackButton
              color="transparent"
              onClick={switchToNucleotideView}
              title={t('Return to full Genome annotation and nucleotide sequence view')}
            >
              <BsArrowReturnLeft size={20} />
            </GeneMapBackButton>
          )}
        </TableCellName>
        <TableCell grow={1} shrink={1} className="w-100">
          <GeneMap />
        </TableCell>
      </GeneMapTableRow>

      <GeneMapAxisTableRow>
        <TableCellName basis={geneMapNameBasisPx} shrink={0} />
        <TableCell grow={1} shrink={1} className="w-100">
          <GeneMapAxis />
        </TableCell>
      </GeneMapAxisTableRow>
    </GeneMapTableContent>
  )
}
