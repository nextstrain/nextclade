import React, { memo } from 'react'

import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { areEqual, FixedSizeList, ListChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import styled from 'styled-components'
import { mix, rgba } from 'polished'

import { QcStatus } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { Sorting } from 'src/helpers/sortResults'
import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { SortCategory, SortDirection } from 'src/helpers/sortResults'
import { resultsSortTrigger } from 'src/state/algorithm/algorithm.actions'
import { setViewedGene } from 'src/state/ui/ui.actions'

import { SequenceView } from 'src/components/SequenceView/SequenceView'
import { PeptideView } from 'src/components/SequenceView/PeptideView'
import { SequenceSelector } from 'src/components/SequenceView/SequenceSelector'

import { ColumnName } from './ColumnName'
import { ColumnQCStatus } from './ColumnQCStatus'
import { ColumnClade } from './ColumnClade'
import { ColumnMutations } from './ColumnMutations'
import { ColumnNonACGTNs } from './ColumnNonACGTNs'
import { ColumnMissing } from './ColumnMissing'
import { ColumnGaps } from './ColumnGaps'
import { ColumnInsertions } from './ColumnInsertions'
import { ColumnFrameShifts } from './ColumnFrameShifts'
import { ColumnStopCodons } from './ColumnStopCodons'
import { ResultsControlsSort } from './ResultsControlsSort'
import { ButtonHelp } from './ButtonHelp'

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
import { COLUMN_WIDTHS, HEADER_ROW_CONTENT_HEIGHT, HEADER_ROW_HEIGHT, ROW_HEIGHT } from './ResultsTableStyle'

export const Table = styled.div<{ rounded?: boolean }>`
  font-size: 0.8rem;
  width: 100%;
  height: 100%;
  background-color: #b3b3b3aa;
  overflow: hidden;
  border-radius: ${(props) => props.rounded && '3px'};
  transition: border-radius 250ms linear;
`

export const TableHeaderRow = styled.div`
  display: flex;
  align-items: stretch;
  height: ${HEADER_ROW_HEIGHT}px;
  overflow-y: scroll;
  background-color: #495057;
  color: #e7e7e7;
`

export const TableHeaderCell = styled.div<{ basis?: string; grow?: number; shrink?: number; first?: boolean }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  border-left: ${(props) => !props.first && `1px solid #b3b3b3aa`};
  overflow: hidden;
  width: 100%;
`

export const TableHeaderCellContent = styled.div`
  height: ${HEADER_ROW_CONTENT_HEIGHT}px;
  display: flex;
`

export const TableCellText = styled.p`
  text-align: center;
  margin: auto;
`

export const TableRow = styled.div<{ even?: boolean; backgroundColor?: string }>`
  display: flex;
  align-items: stretch;
  background-color: ${(props) => props.backgroundColor};
  box-shadow: 1px 2px 2px 2px ${rgba('#212529', 0.25)};
`

export const TableCell = styled.div<{ basis?: string; grow?: number; shrink?: number }>`
  flex-basis: ${(props) => props?.basis};
  flex-grow: ${(props) => props?.grow};
  flex-shrink: ${(props) => props?.shrink};
  overflow: hidden;
  display: flex;
  align-items: center;
  text-align: center;
  border-left: 1px solid #b3b3b3;
`

export const TableCellName = styled(TableCell)<{ basis?: string; grow?: number; shrink?: number }>`
  text-align: left;
  padding-left: 5px;
`

export const TableCellAlignedLeft = styled(TableCell)<{ basis?: string; grow?: number; shrink?: number }>`
  text-align: left;
  padding-left: 5px;
`

export const TableRowPending = styled(TableRow)`
  background-color: #d2d2d2;
  color: #818181;
`

export const TableRowError = styled(TableRow)<{ even?: boolean }>`
  background-color: #f0a9a9;
  color: #962d26;
`

export const ButtonHelpStyled = styled(ButtonHelp)`
  display: block;
`

const highlightRowsWithIssues = true

export interface TableRowDatum extends SequenceAnalysisState {
  viewedGene: string
  columnWidthsPx: Record<keyof typeof COLUMN_WIDTHS, string>
  dynamicColumnWidthPx: string
}

export interface RowProps extends ListChildComponentProps {
  data: TableRowDatum[]
}

function TableRowComponent({ index, style, data }: RowProps) {
  const { t } = useTranslation()

  const { id, seqName, warnings, errors, result: sequence, viewedGene, columnWidthsPx, dynamicColumnWidthPx } = data[
    index
  ]
  const qc = sequence?.qc

  if (errors.length > 0) {
    return (
      <TableRowError style={style} even={index % 2 === 0}>
        <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
          <TableCellText>{id}</TableCellText>
        </TableCell>

        <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
          <ColumnName seqName={seqName} sequence={sequence} warnings={warnings} errors={errors} />
        </TableCellName>

        <TableCell grow={20} shrink={20}>
          <TableCellText>{errors}</TableCellText>
        </TableCell>
      </TableRowError>
    )
  }

  if (!sequence) {
    return (
      <TableRowPending style={style} even={index % 2 === 0}>
        <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
          <TableCellText>{id}</TableCellText>
        </TableCell>

        <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
          <ColumnName seqName={seqName} sequence={sequence} warnings={warnings} errors={errors} />
        </TableCellName>

        <TableCell grow={20} shrink={20}>
          <TableCellText>{t('Analyzing...')}</TableCellText>
        </TableCell>
      </TableRowPending>
    )
  }

  const even = index % 2 === 0
  let color = even ? '#ededed' : '#fcfcfc'
  if (highlightRowsWithIssues && qc) {
    if (qc.overallStatus === QcStatus.mediocre) {
      color = mix(0.5, color, '#ffeeaa')
    } else if (qc.overallStatus === QcStatus.bad) {
      color = mix(0.5, color, '#eeaaaa')
    }
  }

  return (
    <TableRow style={style} backgroundColor={color} even={even}>
      <TableCell basis={columnWidthsPx.id} grow={0} shrink={0}>
        <TableCellText>{id}</TableCellText>
      </TableCell>

      <TableCellName basis={columnWidthsPx.seqName} shrink={0}>
        <ColumnName seqName={seqName} sequence={sequence} warnings={warnings} errors={errors} />
      </TableCellName>

      <TableCell basis={columnWidthsPx.qc} grow={0} shrink={0}>
        <ColumnQCStatus sequence={sequence} qc={qc} />
      </TableCell>

      <TableCellAlignedLeft basis={columnWidthsPx.clade} grow={0} shrink={0}>
        <ColumnClade sequence={sequence} />
      </TableCellAlignedLeft>

      <TableCell basis={columnWidthsPx.mut} grow={0} shrink={0}>
        <ColumnMutations sequence={sequence} />
      </TableCell>

      <TableCell basis={columnWidthsPx.nonACGTN} grow={0} shrink={0}>
        <ColumnNonACGTNs sequence={sequence} />
      </TableCell>

      <TableCell basis={columnWidthsPx.ns} grow={0} shrink={0}>
        <ColumnMissing sequence={sequence} />
      </TableCell>

      <TableCell basis={columnWidthsPx.gaps} grow={0} shrink={0}>
        <ColumnGaps sequence={sequence} />
      </TableCell>

      <TableCell basis={columnWidthsPx.insertions} grow={0} shrink={0}>
        <ColumnInsertions sequence={sequence} />
      </TableCell>

      <TableCell basis={columnWidthsPx.frameShifts} grow={0} shrink={0}>
        <ColumnFrameShifts sequence={sequence} />
      </TableCell>

      <TableCell basis={columnWidthsPx.stopCodons} grow={0} shrink={0}>
        <ColumnStopCodons sequence={sequence} />
      </TableCell>

      <TableCell grow={20} shrink={20}>
        {viewedGene === GENE_OPTION_NUC_SEQUENCE ? (
          <SequenceView key={seqName} sequence={sequence} />
        ) : (
          <PeptideView key={seqName} sequence={sequence} viewedGene={viewedGene} warnings={warnings} />
        )}
      </TableCell>
    </TableRow>
  )
}

const TableRowMemo = memo(TableRowComponent, areEqual)

const mapStateToProps = (state: State) => ({
  resultsFiltered: state.algorithm.resultsFiltered,
  filterPanelCollapsed: state.ui.filterPanelCollapsed,
  viewedGene: state.ui.viewedGene,
})

const mapDispatchToProps = {
  resultsSortTrigger: (sorting: Sorting) => resultsSortTrigger(sorting),

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

  resultsFiltered: SequenceAnalysisState[]
  filterPanelCollapsed: boolean
  viewedGene: string

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
  resultsFiltered,
  filterPanelCollapsed,
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

  const data = resultsFiltered
  const rowData: TableRowDatum[] = data.map((datum) => ({ ...datum, viewedGene, columnWidthsPx, dynamicColumnWidthPx }))

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

          <TableHeaderCell grow={20}>
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
                style={{ overflowY: 'scroll' }}
                width={width}
                height={height - HEADER_ROW_HEIGHT}
                itemCount={data.length}
                itemSize={ROW_HEIGHT}
                itemData={rowData}
              >
                {TableRowMemo}
              </FixedSizeList>
            )
          }}
        </AutoSizer>
      </Table>
    </>
  )
}
