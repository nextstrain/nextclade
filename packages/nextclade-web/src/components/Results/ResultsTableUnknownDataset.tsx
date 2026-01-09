import React, { CSSProperties, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { useSetAtom } from 'jotai'
import styled from 'styled-components'
import AutoSizerBase, { Size } from 'react-virtualized-auto-sizer'
import { seqIndicesWithoutDatasetSuggestionsAtom } from 'src/state/autodetect.state'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { FixedSizeList as FixedSizeListBase, FixedSizeListProps } from 'react-window'
import { SortCategory, SortDirection } from 'src/helpers/sortResults'
import { sortAnalysisResultsAtom } from 'src/state/results.state'
import { ResultsTableUnknownDatasetRow } from 'src/components/Results/ResultsTableUnknownDatasetRow'
import type { ResultsTableUnknownDatasetRowDatum } from 'src/components/Results/ResultsTableUnknownDatasetRow'
import {
  HEADER_ROW_HEIGHT,
  ROW_HEIGHT,
  ButtonHelpStyled,
  Table,
  TableCellText,
  TableHeaderCell,
  TableHeaderCellContent,
  TableHeaderRow,
  COLUMN_WIDTHS_PX,
} from './ResultsTableStyle'
import { ResultsControlsSort } from './ResultsControlsSort'
import HelpTipsColumnId from './HelpTips/HelpTipsColumnId.mdx'
import HelpTipsColumnRowIndex from './HelpTips/HelpTipsColumnRowIndex.mdx'
import HelpTipsColumnSeqName from './HelpTips/HelpTipsColumnSeqName.mdx'

const LIST_STYLE: CSSProperties = { overflowY: 'scroll' }

export const AutoSizer = styled(AutoSizerBase)``

export const FixedSizeList = styled(FixedSizeListBase)<FixedSizeListProps>`
  overflow-x: hidden !important;
`

const columnWidthsPx = COLUMN_WIDTHS_PX

export function ResultsTableUnknownDataset() {
  const { t } = useTranslation()

  const seqIndicesWithoutDatasetSuggestions = useRecoilValue(seqIndicesWithoutDatasetSuggestionsAtom)

  const rowData: ResultsTableUnknownDatasetRowDatum[] = useMemo(() => {
    return seqIndicesWithoutDatasetSuggestions.map((seqIndex) => ({
      seqIndex,
      columnWidthsPx,
    }))
  }, [seqIndicesWithoutDatasetSuggestions])

  // TODO: we could use a map (object) and refer to filters by name,
  // in order to reduce code duplication in the state, callbacks and components being rendered
  const sortByIndexAsc = useSetAtom(sortAnalysisResultsAtom({ category: SortCategory.index, direction: SortDirection.asc }))
  const sortByIndexDesc = useSetAtom(sortAnalysisResultsAtom({ category: SortCategory.index, direction: SortDirection.desc }))
  const sortByNameAsc = useSetAtom(sortAnalysisResultsAtom({ category: SortCategory.seqName, direction: SortDirection.asc }))
  const sortByNameDesc = useSetAtom(sortAnalysisResultsAtom({ category: SortCategory.seqName, direction: SortDirection.desc }))

  return (
    <Table rounded={false}>
      <TableHeaderRow>
        <TableHeaderCell first basis={columnWidthsPx.rowIndex} grow={0} shrink={0}>
          <TableHeaderCellContent>
            <TableCellText>{'#'}</TableCellText>
          </TableHeaderCellContent>
          <ButtonHelpStyled identifier="btn-help-col-row-index">
            <HelpTipsColumnRowIndex />
          </ButtonHelpStyled>
        </TableHeaderCell>

        <TableHeaderCell basis={columnWidthsPx.id} grow={0} shrink={0}>
          <TableHeaderCellContent>
            <TableCellText>{'i'}</TableCellText>
            <ResultsControlsSort sortAsc={sortByIndexAsc} sortDesc={sortByIndexDesc} />
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
      </TableHeaderRow>

      <AutoSizer>
        {({ width, height }: Size) => {
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
              {ResultsTableUnknownDatasetRow}
            </FixedSizeList>
          )
        }}
      </AutoSizer>
    </Table>
  )
}
