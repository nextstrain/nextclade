import { mapValues, sum } from 'lodash'
import { atom, atomFamily, selectorFamily } from 'recoil'
import {
  COLUMN_WIDTHS,
  DYNAMIC_AA_MOTIFS_COLUMN_WIDTH,
  DYNAMIC_CLADE_COLUMN_WIDTH,
  DYNAMIC_PHENOTYPE_COLUMN_WIDTH,
} from 'src/components/Results/ResultsTableStyle'
import { getNumThreads, guessNumThreads } from 'src/helpers/getNumThreads'
import { persistAtom } from 'src/state/persist/localStorage'
import { aaMotifsDescsAtom, cladeNodeAttrDescsAtom, phenotypeAttrDescsAtom } from 'src/state/results.state'

export const isInitializedAtom = atom<boolean>({
  key: 'isInitialized',
  default: false,
})

export const numThreadsAtom = atom<number>({
  key: 'numThreads',
  default: guessNumThreads()?.numThreads ?? getNumThreads(),
  effects: [persistAtom],
})

export const isResultsFilterPanelCollapsedAtom = atom<boolean>({
  key: 'isResultsFilterPanelCollapsedAtom',
  default: true,
})

export const shouldRunAutomaticallyAtom = atom<boolean>({
  key: 'shouldRunAutomatically',
  default: false,
  effects: [persistAtom],
})

export const shouldSuggestDatasetsOnDatasetPageAtom = atom<boolean>({
  key: 'shouldSuggestDatasetsOnDatasetPageAtom',
  default: true,
  effects: [persistAtom],
})

export const lastNotifiedAppVersionAtom = atom<string | undefined>({
  key: 'lastNotifiedAppVersion',
  default: undefined,
  effects: [persistAtom],
})

export const resultsTableColumnWidthsAtom = atomFamily<
  Record<keyof typeof COLUMN_WIDTHS, number>,
  { datasetName: string }
>({
  key: 'columnWidths',
  default: COLUMN_WIDTHS,
})

export const resultsTableColumnWidthsPxAtom = selectorFamily<
  Record<keyof typeof COLUMN_WIDTHS, string>,
  { datasetName: string }
>({
  key: 'columnWidthsPx',
  get:
    ({ datasetName }) =>
    ({ get }) =>
      mapValues(get(resultsTableColumnWidthsAtom({ datasetName })), (width) => `${width}px`),
})

export const resultsTableDynamicCladeColumnWidthAtom = atomFamily<number, { datasetName: string }>({
  key: 'dynamicCladeColumnWidth',
  default: DYNAMIC_CLADE_COLUMN_WIDTH,
})

export const resultsTableDynamicCladeColumnWidthPxAtom = selectorFamily<string, { datasetName: string }>({
  key: 'dynamicCladeColumnWidthPx',
  get:
    ({ datasetName }) =>
    ({ get }) =>
      `${get(resultsTableDynamicCladeColumnWidthAtom({ datasetName }))}px`,
})

export const resultsTableDynamicPhenotypeColumnWidthAtom = atomFamily<number, { datasetName: string }>({
  key: 'dynamicPhenotypeColumnWidth',
  default: DYNAMIC_PHENOTYPE_COLUMN_WIDTH,
})

export const resultsTableDynamicPhenotypeColumnWidthPxAtom = selectorFamily<string, { datasetName: string }>({
  key: 'dynamicPhenotypeColumnWidthPx',
  get:
    ({ datasetName }) =>
    ({ get }) =>
      `${get(resultsTableDynamicPhenotypeColumnWidthAtom({ datasetName }))}px`,
})

export const resultsTableDynamicAaMotifsColumnWidthAtom = atomFamily<number, { datasetName: string }>({
  key: 'resultsTableDynamicAaMotifsColumnWidthAtom',
  default: DYNAMIC_AA_MOTIFS_COLUMN_WIDTH,
})

export const resultsTableDynamicAaMotifsColumnWidthAtomPxAtom = selectorFamily<string, { datasetName: string }>({
  key: 'resultsTableDynamicAaMotifsColumnWidthAtomPxAtom',
  get:
    ({ datasetName }) =>
    ({ get }) =>
      `${get(resultsTableDynamicAaMotifsColumnWidthAtom({ datasetName }))}px`,
})

export const resultsTableTotalWidthAtom = selectorFamily<number, { datasetName: string }>({
  key: 'resultsTableTotalWidth',
  get:
    ({ datasetName }) =>
    ({ get }) => {
      const dynamicCladeColumnsWidthTotal =
        (get(cladeNodeAttrDescsAtom({ datasetName }))?.filter((desc) => !desc.hideInWeb).length ?? 0) *
        get(resultsTableDynamicCladeColumnWidthAtom({ datasetName }))

      const dynamicPhenotypeColumnsWidthTotal =
        (get(phenotypeAttrDescsAtom({ datasetName }))?.length ?? 0) *
        get(resultsTableDynamicPhenotypeColumnWidthAtom({ datasetName }))

      const dynamicAaMotifsColumnsWidthTotal =
        (get(aaMotifsDescsAtom({ datasetName }))?.length ?? 0) *
        get(resultsTableDynamicAaMotifsColumnWidthAtom({ datasetName }))

      return (
        sum(Object.values(COLUMN_WIDTHS)) +
        dynamicCladeColumnsWidthTotal +
        dynamicPhenotypeColumnsWidthTotal +
        dynamicAaMotifsColumnsWidthTotal
      )
    },
})

export const geneMapNameColumnWidthPxAtom = selectorFamily<string, { datasetName: string }>({
  key: 'geneMapNameColumnWidth',
  get:
    ({ datasetName }) =>
    ({ get }) => {
      const totalWidth = get(resultsTableTotalWidthAtom({ datasetName }))
      const sequenceViewColumnWidth = get(resultsTableColumnWidthsAtom({ datasetName })).sequenceView
      const geneMapNameColumnWidth = totalWidth - sequenceViewColumnWidth
      return `${geneMapNameColumnWidth}px`
    },
})
