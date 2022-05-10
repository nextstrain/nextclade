import React, { CSSProperties, useCallback, useMemo } from 'react'

import { useTranslation } from 'react-i18next'
import { FixedSizeList as FixedSizeListBase, FixedSizeListProps } from 'react-window'
import AutoSizerBase from 'react-virtualized-auto-sizer'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'

import {
  resultsTableColumnWidthsPxAtom,
  resultsTableDynamicColumnWidthPxAtom,
  isFilterPanelShownAtom,
  viewedGeneAtom,
} from 'src/state/settings.state'
import { cladeNodeAttrKeysAtom, seqNamesAtom } from 'src/state/results.state'
import type { TableRowDatum } from './ResultsTableRow'
import { ResultsTableRow } from './ResultsTableRow'
import {
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

export function ResultsTable() {
  const { t } = useTranslation()

  const seqNames = useRecoilValue(seqNamesAtom)

  const columnWidthsPx = useRecoilValue(resultsTableColumnWidthsPxAtom)
  const dynamicColumnWidthPx = useRecoilValue(resultsTableDynamicColumnWidthPxAtom)
  const cladeNodeAttrKeys = useRecoilValue(cladeNodeAttrKeysAtom)
  const isFilterPanelShown = useRecoilValue(isFilterPanelShownAtom)
  const viewedGene = useRecoilValue(viewedGeneAtom)

  const rowData: TableRowDatum[] = useMemo(() => {
    return seqNames.map((seqName) => ({
      seqName,
      viewedGene,
      columnWidthsPx,
      dynamicColumnWidthPx,
      cladeNodeAttrKeys,
    }))
  }, [cladeNodeAttrKeys, columnWidthsPx, dynamicColumnWidthPx, seqNames, viewedGene])

  // const resultsSortByKeyTrigger = useCallback(() => {}, [])
  const sortByIdAsc = useCallback(() => {}, [])
  const sortByIdDesc = useCallback(() => {}, [])
  const sortByNameAsc = useCallback(() => {}, [])
  const sortByNameDesc = useCallback(() => {}, [])
  const sortByQcIssuesAsc = useCallback(() => {}, [])
  const sortByQcIssuesDesc = useCallback(() => {}, [])
  const sortByCladeAsc = useCallback(() => {}, [])
  const sortByCladeDesc = useCallback(() => {}, [])
  const sortByTotalMutationsAsc = useCallback(() => {}, [])
  const sortByTotalMutationsDesc = useCallback(() => {}, [])
  const sortByTotalNonAcgtnAsc = useCallback(() => {}, [])
  const sortByTotalNonAcgtnDesc = useCallback(() => {}, [])
  const sortByTotalNsAsc = useCallback(() => {}, [])
  const sortByTotalNsDesc = useCallback(() => {}, [])
  const sortByTotalGapsAsc = useCallback(() => {}, [])
  const sortByTotalGapsDesc = useCallback(() => {}, [])
  const sortByTotalInsertionsAsc = useCallback(() => {}, [])
  const sortByTotalInsertionsDesc = useCallback(() => {}, [])
  const sortByTotalFrameShiftsAsc = useCallback(() => {}, [])
  const sortByTotalFrameShiftsDesc = useCallback(() => {}, [])
  const sortByTotalStopCodonsAsc = useCallback(() => {}, [])
  const sortByTotalStopCodonsDesc = useCallback(() => {}, [])

  const dynamicColumns = useMemo(() => {
    return null
    // return cladeNodeAttrKeys.map((attrKey) => {
    //   const sortAsc = () => resultsSortByKeyTrigger({ key: attrKey, direction: SortDirection.asc })
    //   const sortDesc = () => resultsSortByKeyTrigger({ key: attrKey, direction: SortDirection.desc })
    //
    //   return (
    //     <TableHeaderCell key={attrKey} basis={dynamicColumnWidthPx} grow={0} shrink={0}>
    //       <TableHeaderCellContent>
    //         <TableCellText>{attrKey}</TableCellText>
    //         <ResultsControlsSort sortAsc={sortAsc} sortDesc={sortDesc} />
    //       </TableHeaderCellContent>
    //       <ButtonHelpStyled identifier="btn-help-col-clade" wide>
    //         <HelpTipsColumnClade />
    //       </ButtonHelpStyled>
    //     </TableHeaderCell>
    //   )
    // })
  }, [])

  return (
    <Table rounded={isFilterPanelShown}>
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

        {dynamicColumns}

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
            <SequenceSelector />
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
  )
}
