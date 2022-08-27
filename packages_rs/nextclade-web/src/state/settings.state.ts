import { mapValues, sum } from 'lodash'
import { atom, selector } from 'recoil'
import { COLUMN_WIDTHS, DYNAMIC_COLUMN_WIDTH } from 'src/components/Results/ResultsTableStyle'
import { getNumThreads, guessNumThreads } from 'src/helpers/getNumThreads'
import { persistAtom } from 'src/state/persist/localStorage'
import { cladeNodeAttrKeysAtom } from 'src/state/results.state'

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
  default: true,
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
