import React, { CSSProperties, useDeferredValue, useMemo } from 'react'
import { SequenceViewColumnHeader } from 'src/components/SequenceView/SequenceViewColumnHeader'
import { CDS_OPTION_NUC_SEQUENCE } from 'src/constants'
import { intersection } from 'src/helpers/setOperations'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { FixedSizeList as FixedSizeListBase, FixedSizeListProps } from 'react-window'
import AutoSizerBase, { Size } from 'react-virtualized-auto-sizer'
import { useRecoilValue } from 'recoil'
import { useAtomValue, useSetAtom } from 'jotai'
import { datasetNameToSeqIndicesAtom } from 'src/state/autodetect.state'
import { datasetsForAnalysisAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'
import { viewedCdsAtom } from 'src/state/seqViewSettings.state'
import styled from 'styled-components'

import { SortCategory, SortDirection } from 'src/helpers/sortResults'
import {
  resultsTableColumnWidthsPxAtom,
  resultsTableDynamicCladeColumnWidthPxAtom,
  isResultsFilterPanelCollapsedAtom,
  resultsTableDynamicPhenotypeColumnWidthPxAtom,
  resultsTableDynamicAaMotifsColumnWidthAtomPxAtom,
} from 'src/state/settings.state'
import {
  aaMotifsDescsAtom,
  cladeNodeAttrDescsAtom,
  phenotypeAttrDescsAtom,
  seqIndicesFilteredAtom,
  sortAnalysisResultsAtom,
  sortAnalysisResultsByCustomNodeAttributesAtom,
  sortAnalysisResultsByPhenotypeValuesAtom,
  sortAnalysisResultsByMotifsAtom,
} from 'src/state/results.state'
import { FormattedText } from 'src/components/Common/FormattedText'
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
import HelpTipsColumnRowIndex from './HelpTips/HelpTipsColumnRowIndex.mdx'
import HelpTipsColumnInsertions from './HelpTips/HelpTipsColumnInsertions.mdx'
import HelpTipsColumnMissing from './HelpTips/HelpTipsColumnMissing.mdx'
import HelpTipsCoverage from './HelpTips/HelpTipsColumnCoverage.mdx'
import HelpTipsColumnMut from './HelpTips/HelpTipsColumnMut.mdx'
import HelpTipsColumnNonAcgtn from './HelpTips/HelpTipsColumnNonAcgtn.mdx'
import HelpTipsColumnQC from './HelpTips/HelpTipsColumnQC.mdx'
import HelpTipsColumnFrameShifts from './HelpTips/HelpTipsColumnFrameShifts.mdx'
import HelpTipsColumnStopCodons from './HelpTips/HelpTipsColumnStopCodons.mdx'
import HelpTipsColumnSeqName from './HelpTips/HelpTipsColumnSeqName.mdx'

const LIST_STYLE: CSSProperties = { overflowY: 'scroll' }

export const AutoSizer = styled(AutoSizerBase)``

export const FixedSizeList = styled(FixedSizeListBase)<FixedSizeListProps>`
  overflow-x: hidden !important;
`

interface DynamicCladeColumnProps {
  attrKey: string
  displayName: string
  description: string | undefined
  dynamicCladeColumnWidthPx: string
}

function DynamicCladeColumn({ attrKey, displayName, description, dynamicCladeColumnWidthPx }: DynamicCladeColumnProps) {
  const sortAsc = useSetAtom(
    sortAnalysisResultsByCustomNodeAttributesAtom({
      key: attrKey,
      direction: SortDirection.asc,
    }),
  )
  const sortDesc = useSetAtom(
    sortAnalysisResultsByCustomNodeAttributesAtom({
      key: attrKey,
      direction: SortDirection.desc,
    }),
  )

  return (
    <TableHeaderCell key={attrKey} basis={dynamicCladeColumnWidthPx} grow={0} shrink={0}>
      <TableHeaderCellContent>
        <TableCellText>{displayName}</TableCellText>
        <ResultsControlsSort sortAsc={sortAsc} sortDesc={sortDesc} />
      </TableHeaderCellContent>
      <ButtonHelpStyled identifier={`btn-help-col-clade-${attrKey}`} tooltipWidth="600px">
        <h5>{`Column: ${displayName}`}</h5>
        <p>{description ?? 'No description available'}</p>
      </ButtonHelpStyled>
    </TableHeaderCell>
  )
}

interface DynamicPhenotypeColumnProps {
  name: string
  nameFriendly: string
  description: string
  dynamicPhenotypeColumnWidthPx: string
}

function DynamicPhenotypeColumn({
  name,
  nameFriendly,
  description,
  dynamicPhenotypeColumnWidthPx,
}: DynamicPhenotypeColumnProps) {
  const sortAsc = useSetAtom(sortAnalysisResultsByPhenotypeValuesAtom({ key: name, direction: SortDirection.asc }))
  const sortDesc = useSetAtom(sortAnalysisResultsByPhenotypeValuesAtom({ key: name, direction: SortDirection.desc }))

  return (
    <TableHeaderCell key={name} basis={dynamicPhenotypeColumnWidthPx} grow={0} shrink={0}>
      <TableHeaderCellContent>
        <TableCellText>{nameFriendly}</TableCellText>
        <ResultsControlsSort sortAsc={sortAsc} sortDesc={sortDesc} />
      </TableHeaderCellContent>
      <ButtonHelpStyled identifier={`btn-help-col-phenotype-${name}`} tooltipWidth="600px">
        <h5>{`Column: ${nameFriendly}`}</h5>
        <FormattedText text={description} />
      </ButtonHelpStyled>
    </TableHeaderCell>
  )
}

interface DynamicAaMotifsColumnProps {
  name: string
  nameFriendly: string
  nameShort: string
  description: string
  dynamicAaMotifsColumnWidthPx: string
}

function DynamicAaMotifsColumn({
  name,
  nameFriendly,
  nameShort,
  description,
  dynamicAaMotifsColumnWidthPx,
}: DynamicAaMotifsColumnProps) {
  const sortAsc = useSetAtom(sortAnalysisResultsByMotifsAtom({ key: name, direction: SortDirection.asc }))
  const sortDesc = useSetAtom(sortAnalysisResultsByMotifsAtom({ key: name, direction: SortDirection.desc }))

  return (
    <TableHeaderCell key={name} basis={dynamicAaMotifsColumnWidthPx} grow={0} shrink={0}>
      <TableHeaderCellContent>
        <TableCellText>{nameShort}</TableCellText>
        <ResultsControlsSort sortAsc={sortAsc} sortDesc={sortDesc} />
      </TableHeaderCellContent>
      <ButtonHelpStyled identifier={`btn-help-col-aa-motifs-${name}`} tooltipWidth="600px">
        <h5>{`Column: ${nameFriendly}`}</h5>
        <FormattedText text={description} />
      </ButtonHelpStyled>
    </TableHeaderCell>
  )
}

export function ResultsTable() {
  const { t } = useTranslation()

  const seqIndicesImmediate = useAtomValue(seqIndicesFilteredAtom)
  const seqIndices = useDeferredValue(seqIndicesImmediate)

  const datasetNameToSeqIndices = useRecoilValue(datasetNameToSeqIndicesAtom)

  const datasetsForAnalysis = useRecoilValue(datasetsForAnalysisAtom)

  const datasetName = useRecoilValue(viewedDatasetNameAtom)

  const columnWidthsPx = useRecoilValue(resultsTableColumnWidthsPxAtom({ datasetName }))
  const dynamicCladeColumnWidthPx = useRecoilValue(resultsTableDynamicCladeColumnWidthPxAtom({ datasetName }))
  const dynamicPhenotypeColumnWidthPx = useRecoilValue(resultsTableDynamicPhenotypeColumnWidthPxAtom({ datasetName }))
  const dynamicAaMotifsColumnWidthPx = useRecoilValue(resultsTableDynamicAaMotifsColumnWidthAtomPxAtom({ datasetName }))
  const cladeNodeAttrDescs = useRecoilValue(cladeNodeAttrDescsAtom({ datasetName }))
  const phenotypeAttrDescs = useRecoilValue(phenotypeAttrDescsAtom({ datasetName }))
  const aaMotifsDescs = useRecoilValue(aaMotifsDescsAtom({ datasetName }))

  const isResultsFilterPanelCollapsed = useRecoilValue(isResultsFilterPanelCollapsedAtom)
  const viewedGene = useRecoilValue(viewedCdsAtom({ datasetName })) ?? CDS_OPTION_NUC_SEQUENCE

  const rowData: TableRowDatum[] = useMemo(() => {
    // Sequences which are already analyzed
    let seqIndicesReady = new Set(seqIndices)

    if (datasetsForAnalysis?.length !== 1) {
      // Sequences belonging to the currently selected dataset
      const seqIndicesSelected = new Set(datasetNameToSeqIndices.get(datasetName) ?? [])

      // Sequences which are already analyzed and belonging to the currently selected dataset
      seqIndicesReady = intersection(seqIndicesReady, seqIndicesSelected)
    }

    return [...seqIndicesReady].map((seqIndex) => ({
      seqIndex,
      viewedGene,
      columnWidthsPx,
      dynamicCladeColumnWidthPx,
      dynamicPhenotypeColumnWidthPx,
      dynamicAaMotifsColumnWidthPx,
      cladeNodeAttrDescs: cladeNodeAttrDescs ?? [],
      phenotypeAttrDescs: phenotypeAttrDescs ?? [],
      aaMotifsDescs: aaMotifsDescs ?? [],
    }))
  }, [
    aaMotifsDescs,
    cladeNodeAttrDescs,
    columnWidthsPx,
    datasetName,
    datasetNameToSeqIndices,
    datasetsForAnalysis?.length,
    dynamicAaMotifsColumnWidthPx,
    dynamicCladeColumnWidthPx,
    dynamicPhenotypeColumnWidthPx,
    phenotypeAttrDescs,
    seqIndices,
    viewedGene,
  ])

  // TODO: we could use a map (object) and refer to filters by name,
  // in order to reduce code duplication in the state, callbacks and components being rendered
  const sortByIndexAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.index,
      direction: SortDirection.asc,
    }),
  )
  const sortByIndexDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.index,
      direction: SortDirection.desc,
    }),
  )
  const sortByNameAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.seqName,
      direction: SortDirection.asc,
    }),
  )
  const sortByNameDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.seqName,
      direction: SortDirection.desc,
    }),
  )
  const sortByQcIssuesAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.qcIssues,
      direction: SortDirection.asc,
    }),
  )
  const sortByQcIssuesDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.qcIssues,
      direction: SortDirection.desc,
    }),
  )
  const sortByCladeAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.clade,
      direction: SortDirection.asc,
    }),
  )
  const sortByCladeDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.clade,
      direction: SortDirection.desc,
    }),
  )
  const sortByCoverageAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.coverage,
      direction: SortDirection.asc,
    }),
  )
  const sortByCoverageDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.coverage,
      direction: SortDirection.desc,
    }),
  )
  const sortByTotalMutationsAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalMutations,
      direction: SortDirection.asc,
    }),
  )
  const sortByTotalMutationsDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalMutations,
      direction: SortDirection.desc,
    }),
  )
  const sortByTotalNonAcgtnAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalNonACGTNs,
      direction: SortDirection.asc,
    }),
  )
  const sortByTotalNonAcgtnDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalNonACGTNs,
      direction: SortDirection.desc,
    }),
  )
  const sortByTotalNsAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalMissing,
      direction: SortDirection.asc,
    }),
  )
  const sortByTotalNsDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalMissing,
      direction: SortDirection.desc,
    }),
  )
  const sortByTotalGapsAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalGaps,
      direction: SortDirection.asc,
    }),
  )
  const sortByTotalGapsDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalGaps,
      direction: SortDirection.desc,
    }),
  )
  const sortByTotalInsertionsAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalInsertions,
      direction: SortDirection.asc,
    }),
  )
  const sortByTotalInsertionsDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalInsertions,
      direction: SortDirection.desc,
    }),
  )
  const sortByTotalFrameShiftsAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalFrameShifts,
      direction: SortDirection.asc,
    }),
  )
  const sortByTotalFrameShiftsDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalFrameShifts,
      direction: SortDirection.desc,
    }),
  )
  const sortByTotalStopCodonsAsc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalStopCodons,
      direction: SortDirection.asc,
    }),
  )
  const sortByTotalStopCodonsDesc = useSetAtom(
    sortAnalysisResultsAtom({
      category: SortCategory.totalStopCodons,
      direction: SortDirection.desc,
    }),
  )

  const dynamicCladeColumns = useMemo(() => {
    return (
      cladeNodeAttrDescs
        ?.filter((attr) => !attr.hideInWeb)
        .map(({ name: attrKey, displayName, description }) => (
          <DynamicCladeColumn
            key={attrKey}
            attrKey={attrKey}
            displayName={displayName}
            description={description}
            dynamicCladeColumnWidthPx={dynamicCladeColumnWidthPx}
          />
        )) ?? []
    )
  }, [cladeNodeAttrDescs, dynamicCladeColumnWidthPx])

  const dynamicPhenotypeColumns = useMemo(() => {
    return (
      phenotypeAttrDescs?.map(({ name, nameFriendly, description }) => (
        <DynamicPhenotypeColumn
          key={name}
          name={name}
          nameFriendly={nameFriendly}
          description={description}
          dynamicPhenotypeColumnWidthPx={dynamicPhenotypeColumnWidthPx}
        />
      )) ?? []
    )
  }, [phenotypeAttrDescs, dynamicPhenotypeColumnWidthPx])

  const dynamicAaMotifsColumns = useMemo(() => {
    return (
      aaMotifsDescs?.map(({ name, nameFriendly, nameShort, description }) => (
        <DynamicAaMotifsColumn
          key={name}
          name={name}
          nameFriendly={nameFriendly}
          nameShort={nameShort}
          description={description}
          dynamicAaMotifsColumnWidthPx={dynamicAaMotifsColumnWidthPx}
        />
      )) ?? []
    )
  }, [aaMotifsDescs, dynamicAaMotifsColumnWidthPx])

  return (
    <Table rounded={isResultsFilterPanelCollapsed}>
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

        {dynamicCladeColumns}

        {dynamicPhenotypeColumns}

        {dynamicAaMotifsColumns}

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

        <TableHeaderCell basis={columnWidthsPx.coverage} grow={0} shrink={0}>
          <TableHeaderCellContent>
            <TableCellText>{t('Cov.')}</TableCellText>
            <ResultsControlsSort sortAsc={sortByCoverageAsc} sortDesc={sortByCoverageDesc} />
          </TableHeaderCellContent>
          <ButtonHelpStyled identifier="btn-help-col-coverage">
            <HelpTipsCoverage />
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
          <SequenceViewColumnHeader />
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
              {ResultsTableRow}
            </FixedSizeList>
          )
        }}
      </AutoSizer>
    </Table>
  )
}
