import React, { CSSProperties } from 'react'

import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { FixedSizeList as FixedSizeListBase, FixedSizeListProps } from 'react-window'
import AutoSizerBase from 'react-virtualized-auto-sizer'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'

import type { Sorting, SortingKeyBased } from 'src/helpers/sortResults'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { State } from 'src/state/reducer'
import { SortCategory, SortDirection } from 'src/helpers/sortResults'
import { seqNamesAtom } from 'src/state/results.state'
import { resultsSortByKeyTrigger, resultsSortTrigger } from 'src/state/algorithm/algorithm.actions'
import { setViewedGene } from 'src/state/ui/ui.actions'
import type { TableRowDatum } from './ResultsTableRow'
import { ResultsTableRow } from './ResultsTableRow'
import {
  COLUMN_WIDTHS,
  HEADER_ROW_HEIGHT,
  ROW_HEIGHT,
  ButtonHelpStyled,
  Table,
  TableCellText,
  TableHeaderCell,
  TableHeaderCellContent,
  TableHeaderRow,
} from './ResultsTableStyle'
import { ResultsControlsSort } from './ResultsControlsSort'
import HelpTipsColumnClade from './HelpTips/HelpTipsColumnClade.mdx'
import HelpTipsColumnGaps from './HelpTips/HelpTipsColumnGaps.mdx'
import HelpTipsColumnId from './HelpTips/HelpTipsColumnId.mdx'
import HelpTipsColumnInsertions from './HelpTips/HelpTipsColumnInsertions.mdx'
import HelpTipsColumnMissing from './HelpTips/HelpTipsColumnMissing.mdx'
import HelpTipsColumnMut from './HelpTips/HelpTipsColumnMut.mdx'
import HelpTipsColumnNonAcgtn from './HelpTips/HelpTipsColumnNonAcgtn.mdx'
import HelpTipsColumnQC from './HelpTips/HelpTipsColumnQC.mdx'
import HelpTipsColumnFrameShifts from './HelpTips/HelpTipsColumnFrameShifts.mdx'
import HelpTipsColumnStopCodons from './HelpTips/HelpTipsColumnStopCodons.mdx'
import HelpTipsColumnSeqName from './HelpTips/HelpTipsColumnSeqName.mdx'
import HelpTipsColumnSeqView from './HelpTips/HelpTipsColumnSeqView.mdx'
import { SequenceSelector } from '../SequenceView/SequenceSelector'

const LIST_STYLE: CSSProperties = { overflowY: 'scroll' }

export const AutoSizer = styled(AutoSizerBase)``

export const FixedSizeList = styled(FixedSizeListBase)<FixedSizeListProps>`
  overflow-x: hidden !important;
`

const mapStateToProps = (state: State) => ({
  resultsFiltered: state.algorithm.resultsFiltered,
  filterPanelCollapsed: state.ui.filterPanelCollapsed,
  viewedGene: state.ui.viewedGene,
})

const mapDispatchToProps = {
  resultsSortTrigger: (sorting: Sorting) => resultsSortTrigger(sorting),

  resultsSortByKeyTrigger,

  sortByIdAsc: () => resultsSortTrigger({ category: SortCategory.id, direction: SortDirection.asc }),
  sortByIdDesc: () => resultsSortTrigger({ category: SortCategory.id, direction: SortDirection.desc }),

  sortByNameAsc: () => resultsSortTrigger({ category: SortCategory.seqName, direction: SortDirection.asc }),
  sortByNameDesc: () => resultsSortTrigger({ category: SortCategory.seqName, direction: SortDirection.desc }),

  sortByQcIssuesAsc: () => resultsSortTrigger({ category: SortCategory.qcIssues, direction: SortDirection.asc }),
  sortByQcIssuesDesc: () => resultsSortTrigger({ category: SortCategory.qcIssues, direction: SortDirection.desc }),

  sortByCladeAsc: () => resultsSortTrigger({ category: SortCategory.clade, direction: SortDirection.asc }),
  sortByCladeDesc: () => resultsSortTrigger({ category: SortCategory.clade, direction: SortDirection.desc }),

  sortByTotalMutationsAsc: () => resultsSortTrigger({
    category: SortCategory.totalMutations,
    direction: SortDirection.asc,
  }), // prettier-ignore
  sortByTotalMutationsDesc: () => resultsSortTrigger({
    category: SortCategory.totalMutations,
    direction: SortDirection.desc,
  }), // prettier-ignore

  sortByTotalNonAcgtnAsc: () => resultsSortTrigger({
    category: SortCategory.totalNonACGTNs,
    direction: SortDirection.asc,
  }), // prettier-ignore
  sortByTotalNonAcgtnDesc: () => resultsSortTrigger({
    category: SortCategory.totalNonACGTNs,
    direction: SortDirection.desc,
  }), // prettier-ignore

  sortByTotalNsAsc: () => resultsSortTrigger({ category: SortCategory.totalMissing, direction: SortDirection.asc }),
  sortByTotalNsDesc: () => resultsSortTrigger({ category: SortCategory.totalMissing, direction: SortDirection.desc }),

  sortByTotalGapsAsc: () => resultsSortTrigger({ category: SortCategory.totalGaps, direction: SortDirection.asc }),
  sortByTotalGapsDesc: () => resultsSortTrigger({ category: SortCategory.totalGaps, direction: SortDirection.desc }),

  sortByTotalInsertionsAsc: () =>
    resultsSortTrigger({ category: SortCategory.totalInsertions, direction: SortDirection.asc }),
  sortByTotalInsertionsDesc: () =>
    resultsSortTrigger({ category: SortCategory.totalInsertions, direction: SortDirection.desc }),

  sortByTotalFrameShiftsAsc: () =>
    resultsSortTrigger({ category: SortCategory.totalFrameShifts, direction: SortDirection.asc }),
  sortByTotalFrameShiftsDesc: () =>
    resultsSortTrigger({ category: SortCategory.totalFrameShifts, direction: SortDirection.desc }),

  sortByTotalStopCodonsAsc: () =>
    resultsSortTrigger({ category: SortCategory.totalStopCodons, direction: SortDirection.asc }),
  sortByTotalStopCodonsDesc: () =>
    resultsSortTrigger({ category: SortCategory.totalStopCodons, direction: SortDirection.desc }),

  setViewedGene,
}

export const ResultsTable = React.memo(connect(mapStateToProps, mapDispatchToProps)(ResultsTableDisconnected))

export interface ResultProps {
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
  dynamicColumnWidthPx: string
  cladeNodeAttrKeys: string[]

  resultsFiltered: SequenceAnalysisState[]
  filterPanelCollapsed: boolean
  viewedGene: string

  resultsSortByKeyTrigger(sorting: SortingKeyBased): void

  sortByIdAsc(): void

  sortByIdDesc(): void

  sortByNameAsc(): void

  sortByNameDesc(): void

  sortByQcIssuesAsc(): void

  sortByQcIssuesDesc(): void

  sortByCladeAsc(): void

  sortByCladeDesc(): void

  sortByTotalMutationsAsc(): void

  sortByTotalMutationsDesc(): void

  sortByTotalNonAcgtnAsc(): void

  sortByTotalNonAcgtnDesc(): void

  sortByTotalNsAsc(): void

  sortByTotalNsDesc(): void

  sortByTotalGapsAsc(): void

  sortByTotalGapsDesc(): void

  sortByTotalInsertionsAsc(): void

  sortByTotalInsertionsDesc(): void

  sortByTotalFrameShiftsAsc(): void

  sortByTotalFrameShiftsDesc(): void

  sortByTotalStopCodonsAsc(): void

  sortByTotalStopCodonsDesc(): void

  setViewedGene(viewedGene: string): void
}

export function ResultsTableDisconnected({
  columnWidthsPx,
  dynamicColumnWidthPx,
  cladeNodeAttrKeys,
  resultsFiltered,
  filterPanelCollapsed,
  resultsSortByKeyTrigger,
  sortByIdAsc,
  sortByIdDesc,
  sortByNameAsc,
  sortByNameDesc,
  sortByQcIssuesAsc,
  sortByQcIssuesDesc,
  sortByCladeAsc,
  sortByCladeDesc,
  sortByTotalMutationsAsc,
  sortByTotalMutationsDesc,
  sortByTotalNonAcgtnAsc,
  sortByTotalNonAcgtnDesc,
  sortByTotalNsAsc,
  sortByTotalNsDesc,
  sortByTotalGapsAsc,
  sortByTotalGapsDesc,
  sortByTotalInsertionsAsc,
  sortByTotalInsertionsDesc,
  sortByTotalFrameShiftsAsc,
  sortByTotalFrameShiftsDesc,
  sortByTotalStopCodonsAsc,
  sortByTotalStopCodonsDesc,
  viewedGene,
  setViewedGene,
}: ResultProps) {
  const { t } = useTranslation()

  const seqNames = useRecoilValue(seqNamesAtom)

  const rowData: TableRowDatum[] = seqNames.map((seqName) => ({
    seqName,
    viewedGene,
    columnWidthsPx,
    dynamicColumnWidthPx,
    cladeNodeAttrKeys,
  }))

  return (
    <>
      <Table rounded={!filterPanelCollapsed}>
        <TableHeaderRow>
          <TableHeaderCell first basis={columnWidthsPx.id} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('ID')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByIdAsc} sortDesc={sortByIdDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-seq-id">
              <HelpTipsColumnId />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.seqName} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('Sequence name')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByNameAsc} sortDesc={sortByNameDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-seq-name">
              <HelpTipsColumnSeqName />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.qc} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('QC')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByQcIssuesAsc} sortDesc={sortByQcIssuesDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-qc">
              <HelpTipsColumnQC />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.clade} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('Clade')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByCladeAsc} sortDesc={sortByCladeDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-clade" wide>
              <HelpTipsColumnClade />
            </ButtonHelpStyled>
          </TableHeaderCell>

          {cladeNodeAttrKeys.map((attrKey) => {
            const sortAsc = () => resultsSortByKeyTrigger({ key: attrKey, direction: SortDirection.asc })
            const sortDesc = () => resultsSortByKeyTrigger({ key: attrKey, direction: SortDirection.desc })

            return (
              <TableHeaderCell key={attrKey} basis={dynamicColumnWidthPx} grow={0} shrink={0}>
                <TableHeaderCellContent>
                  <TableCellText>{attrKey}</TableCellText>
                  <ResultsControlsSort sortAsc={sortAsc} sortDesc={sortDesc} />
                </TableHeaderCellContent>
                <ButtonHelpStyled identifier="btn-help-col-clade" wide>
                  <HelpTipsColumnClade />
                </ButtonHelpStyled>
              </TableHeaderCell>
            )
          })}

          <TableHeaderCell basis={columnWidthsPx.mut} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('Mut.')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByTotalMutationsAsc} sortDesc={sortByTotalMutationsDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-mut">
              <HelpTipsColumnMut />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.nonACGTN} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('non-ACGTN')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByTotalNonAcgtnAsc} sortDesc={sortByTotalNonAcgtnDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-nonacgtn">
              <HelpTipsColumnNonAcgtn />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.ns} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('Ns')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByTotalNsAsc} sortDesc={sortByTotalNsDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-missing">
              <HelpTipsColumnMissing />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.gaps} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('Gaps')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByTotalGapsAsc} sortDesc={sortByTotalGapsDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-gaps">
              <HelpTipsColumnGaps />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.insertions} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('Ins.')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByTotalInsertionsAsc} sortDesc={sortByTotalInsertionsDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-insertions">
              <HelpTipsColumnInsertions />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.frameShifts} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('FS')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByTotalFrameShiftsAsc} sortDesc={sortByTotalFrameShiftsDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-frame-shifts">
              <HelpTipsColumnFrameShifts />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.stopCodons} grow={0} shrink={0}>
            <TableHeaderCellContent>
              <TableCellText>{t('SC')}</TableCellText>
              <ResultsControlsSort sortAsc={sortByTotalStopCodonsAsc} sortDesc={sortByTotalStopCodonsDesc} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-stop-codons">
              <HelpTipsColumnStopCodons />
            </ButtonHelpStyled>
          </TableHeaderCell>

          <TableHeaderCell basis={columnWidthsPx.sequenceView} grow={1} shrink={0}>
            <TableHeaderCellContent>
              <SequenceSelector viewedGene={viewedGene} setViewedGene={setViewedGene} />
            </TableHeaderCellContent>
            <ButtonHelpStyled identifier="btn-help-col-seq-view" tooltipWidth="600px">
              <HelpTipsColumnSeqView />
            </ButtonHelpStyled>
          </TableHeaderCell>
        </TableHeaderRow>

        <AutoSizer>
          {({ width, height }) => {
            return (
              <FixedSizeList
                overscanCount={10}
                style={LIST_STYLE}
                width={width}
                height={height - HEADER_ROW_HEIGHT}
                itemCount={rowData.length}
                itemSize={ROW_HEIGHT}
                itemData={rowData}
              >
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                {ResultsTableRow}
              </FixedSizeList>
            )
          }}
        </AutoSizer>
      </Table>
    </>
  )
}
