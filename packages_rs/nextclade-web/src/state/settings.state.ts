import { mapValues, sum } from 'lodash'
import { atom, selector } from 'recoil'

import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { getNumThreads, guessNumThreads } from 'src/helpers/getNumThreads'
import { COLUMN_WIDTHS, DYNAMIC_COLUMN_WIDTH } from 'src/components/Results/ResultsTableStyle'
import { cladeNodeAttrKeysAtom } from 'src/state/results.state'
import { persistAtom } from 'src/state/persist/localStorage'

export const isInitializedAtom = atom<boolean>({
  key: 'isInitialized',
  default: false,
})

export const numThreadsAtom = atom<number>({
  key: 'numThreads',
  default: guessNumThreads()?.numThreads ?? getNumThreads(),
  effects: [persistAtom],
})

export const isSettingsDialogOpenAtom = atom<boolean>({
  key: 'isSettingsDialogOpen',
  default: false,
})

export const isNewRunPopupShownAtom = atom<boolean>({
  key: 'isNewRunPopupShown',
  default: false,
})

export const isResultsFilterPanelCollapsedAtom = atom<boolean>({
  key: 'isResultsfilterPanelCollapsed',
  default: false,
})

export const shouldRunAutomaticallyAtom = atom<boolean>({
  key: 'shouldRunAutomatically',
  default: false,
  effects: [persistAtom],
})

export const changelogIsShownAtom = atom<boolean>({
  key: 'changelogIsShown',
  default: false,
})

export const changelogShouldShowOnUpdatesAtom = atom<boolean>({
  key: 'changelogShouldShowOnUpdates',
  default: true,
  effects: [persistAtom],
})

export const changelogLastVersionSeenAtom = atom<string>({
  key: 'changelogLastVersionSeen',
  default: '',
  effects: [persistAtom],
})

export const showNewRunPopupAtom = atom({
  key: 'showNewRunPopup',
  default: false,
})

export const resultsTableColumnWidthsAtom = atom<Record<keyof typeof COLUMN_WIDTHS, number>>({
  key: 'columnWidths',
  default: COLUMN_WIDTHS,
})

export const resultsTableColumnWidthsPxAtom = selector<Record<keyof typeof COLUMN_WIDTHS, string>>({
  key: 'columnWidthsPx',
  get: ({ get }) => mapValues(get(resultsTableColumnWidthsAtom), (width) => `${width}px`),
})

export const resultsTableDynamicColumnWidthAtom = atom<number>({
  key: 'dynamicColumnWidth',
  default: DYNAMIC_COLUMN_WIDTH,
})

export const resultsTableDynamicColumnWidthPxAtom = selector<string>({
  key: 'dynamicColumnWidthPx',
  get: ({ get }) => `${get(resultsTableDynamicColumnWidthAtom)}px`,
})

export const isFilterPanelShownAtom = atom<boolean>({
  key: 'isFilterPanelShownAtom',
  default: false,
})

export const viewedGeneAtom = atom<string>({
  key: 'viewedGene',
  default: GENE_OPTION_NUC_SEQUENCE,
})

export const isInNucleotideViewAtom = selector<boolean>({
  key: 'isInNucleotideView',
  get: ({ get }) => get(viewedGeneAtom) === GENE_OPTION_NUC_SEQUENCE,
})

export const switchToNucleotideViewAtom = selector({
  key: 'switchToNucleotideView',
  get: () => undefined,
  set: ({ set }) => set(viewedGeneAtom, GENE_OPTION_NUC_SEQUENCE),
})

export const resultsTableTotalWidthAtom = selector<number>({
  key: 'resultsTableTotalWidth',
  get({ get }) {
    const dynamicColumnsWidthTotal = get(cladeNodeAttrKeysAtom).length * get(resultsTableDynamicColumnWidthAtom)
    return sum(Object.values(COLUMN_WIDTHS)) + dynamicColumnsWidthTotal
  },
})

export const geneMapNameColumnWidthPxAtom = selector<string>({
  key: 'geneMapNameColumnWidth',
  get({ get }) {
    const totalWidth = get(resultsTableTotalWidthAtom)
    const sequenceViewColumnWidth = get(resultsTableColumnWidthsAtom).sequenceView
    const geneMapNameColumnWidth = totalWidth - sequenceViewColumnWidth
    return `${geneMapNameColumnWidth}px`
  },
})
