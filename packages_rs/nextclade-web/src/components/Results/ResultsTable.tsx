import React, { CSSProperties, useCallback, useDeferredValue, useMemo } from 'react'

import { useTranslation } from 'react-i18next'
import { FixedSizeList as FixedSizeListBase, FixedSizeListProps } from 'react-window'
import AutoSizerBase from 'react-virtualized-auto-sizer'
import { useRecoilCallback, useRecoilValue } from 'recoil'
import { SortCategory, SortDirection } from 'src/helpers/sortResults'
import styled from 'styled-components'

import {
  resultsTableColumnWidthsPxAtom,
  resultsTableDynamicColumnWidthPxAtom,
  viewedGeneAtom,
  isResultsFilterPanelCollapsedAtom,
} from 'src/state/settings.state'
import {
  cladeNodeAttrDescsAtom,
  cladeNodeAttrKeysAtom,
  seqNamesFilteredAtom,
  sortAnalysisResultsAtom,
  sortAnalysisResultsByKeyAtom,
} from 'src/state/results.state'
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
import { ColumnCustomNodeAttr } from './ColumnCustomNodeAttr'

const LIST_STYLE: CSSProperties = { overflowY: 'scroll' }

export const AutoSizer = styled(AutoSizerBase)``

export const FixedSizeList = styled(FixedSizeListBase)<FixedSizeListProps>`
  overflow-x: hidden !important;
`

export function ResultsTable() {
  const { t } = useTranslation()

  const seqNamesImmediate = useRecoilValue(seqNamesFilteredAtom)
  const seqNames = useDeferredValue(seqNamesImmediate)

  const columnWidthsPx = useRecoilValue(resultsTableColumnWidthsPxAtom)
  const dynamicColumnWidthPx = useRecoilValue(resultsTableDynamicColumnWidthPxAtom)
  const cladeNodeAttrKeys = useRecoilValue(cladeNodeAttrKeysAtom)
  const cladeNodeAttrDescs = useRecoilValue(cladeNodeAttrDescsAtom)
  const isResultsFilterPanelCollapsed = useRecoilValue(isResultsFilterPanelCollapsedAtom)
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

  // TODO: we could use a map (object) and refer to filters by name,
  // in order to reduce code duplication in the state, callbacks and components being rendered
  const sortByIndexAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.index, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByIndexDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.index, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByNameAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.seqName, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByNameDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.seqName, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByQcIssuesAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.qcIssues, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByQcIssuesDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.qcIssues, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByCladeAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.clade, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByCladeDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.clade, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalMutationsAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalMutations, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalMutationsDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalMutations, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalNonAcgtnAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalNonACGTNs, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalNonAcgtnDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalNonACGTNs, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalNsAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalMissing, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalNsDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalMissing, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalGapsAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalGaps, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalGapsDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalGaps, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalInsertionsAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalInsertions, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalInsertionsDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalInsertions, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalFrameShiftsAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalFrameShifts, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalFrameShiftsDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalFrameShifts, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalStopCodonsAsc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalStopCodons, direction: SortDirection.asc  }), undefined)  }, []) // prettier-ignore
  const sortByTotalStopCodonsDesc = useRecoilCallback(({set}) => () => { set(sortAnalysisResultsAtom({ category: SortCategory.totalStopCodons, direction: SortDirection.desc  }), undefined)  }, []) // prettier-ignore
  const sortByKey = useRecoilCallback(({ set }) => (key: string, direction: SortDirection) => () => {
    set(sortAnalysisResultsByKeyAtom({ key, direction  }), undefined)
  }, []) // prettier-ignore

  const dynamicColumns = useMemo(() => {
    return cladeNodeAttrDescs.map(({ name: attrKey, displayName, description }) => {
      const sortAsc = sortByKey(attrKey, SortDirection.asc)
      const sortDesc = sortByKey(attrKey, SortDirection.desc)
      return (
        <TableHeaderCell key={attrKey} basis={dynamicColumnWidthPx} grow={0} shrink={0}>
          <TableHeaderCellContent>
            <TableCellText>{displayName}</TableCellText>
            <ResultsControlsSort sortAsc={sortAsc} sortDesc={sortDesc} />
          </TableHeaderCellContent>
          <ButtonHelpStyled identifier="btn-help-col-clade" wide>
            <h5>{`Column: ${displayName}`}</h5>
            <p>{description}</p>
          </ButtonHelpStyled>
        </TableHeaderCell>
      )
    })
  }, [cladeNodeAttrKeys, dynamicColumnWidthPx, sortByKey])

  return (
    <Table rounded={isResultsFilterPanelCollapsed}>
      <TableHeaderRow>
        <TableHeaderCell first basis={columnWidthsPx.id} grow={0} shrink={0}>
          <TableHeaderCellContent>
            <TableCellText>{t('ID')}</TableCellText>
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
