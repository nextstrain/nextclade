import { atom, atomFamily, selector, DefaultValue } from 'recoil'
import { mapMaybe, notUndefinedOrNull } from 'src/helpers/notUndefined'
import type { Dataset, MinimizerIndexVersion } from 'src/types'
import { multiAtom } from 'src/state/utils/multiAtom'
import { persistAtom } from 'src/state/persist/localStorage'

export const UNKNOWN_DATASET_NAME = '__UNKNOWN__' as const

export const datasetServerUrlAtom = atom<string | undefined>({
  key: 'datasetServerUrlAtom',
  default: undefined,
})

export const datasetsAtom = atom<Dataset[]>({
  key: 'datasets',
  default: [],
})

// All datasets including historical versions for tag-based lookup
export const allDatasetsAtom = atom<Dataset[]>({
  key: 'allDatasets',
  default: [],
})

// Dataset selection interface and state
// serverUrl is optional - undefined means default server (from env var)
// tag is optional - undefined means use latest version
export interface DatasetSelection {
  serverUrl?: string
  path: string
  tag?: string
}

export const datasetSelectionAtom = atom<DatasetSelection | undefined>({
  key: 'datasetSelection',
  default: undefined,
  effects: [persistAtom],
})

// Current dataset derived from selection
export const datasetSingleCurrentAtom = selector<Dataset | undefined>({
  key: 'datasetSingleCurrentAtom',
  get: ({ get }) => {
    const selection = get(datasetSelectionAtom)
    const currentServerUrl = get(datasetServerUrlAtom)
    const allDatasets = get(allDatasetsAtom)
    const latestDatasets = get(datasetsAtom)

    if (!selection || allDatasets.length === 0) {
      return undefined
    }

    // Determine effective server URLs for comparison
    // undefined in selection means default server
    const selectionServerUrl = selection.serverUrl ?? process.env.DATA_FULL_DOMAIN ?? '/'
    const effectiveCurrentServerUrl = currentServerUrl ?? process.env.DATA_FULL_DOMAIN ?? '/'

    // If the server URLs don't match, the selection is no longer valid
    if (selectionServerUrl !== effectiveCurrentServerUrl) {
      return undefined
    }

    // If tag is undefined, use the latest version for this path
    if (!selection.tag) {
      return latestDatasets.find((dataset) => dataset.path === selection.path)
    }

    // Find the dataset that matches both path and tag from ALL datasets (including historical)
    return allDatasets.find((dataset) => dataset.path === selection.path && dataset.version?.tag === selection.tag)
  },
  set: ({ set, get }, newValue) => {
    if (newValue instanceof DefaultValue) {
      set(datasetSelectionAtom, undefined)
      return
    }

    if (!newValue) {
      set(datasetSelectionAtom, undefined)
      return
    }

    if (newValue.path && newValue.version?.tag) {
      const currentServerUrl = get(datasetServerUrlAtom)
      const defaultServerUrl = process.env.DATA_FULL_DOMAIN ?? '/'
      const effectiveCurrentServerUrl = currentServerUrl ?? defaultServerUrl
      const latestDatasets = get(datasetsAtom)

      // Check if this is the latest version for this path
      const latestDataset = latestDatasets.find((dataset) => dataset.path === newValue.path)
      const isLatestTag = latestDataset?.version?.tag === newValue.version.tag

      const selection: DatasetSelection = {
        // Only set serverUrl if it's not the default (for persistence)
        serverUrl: effectiveCurrentServerUrl === defaultServerUrl ? undefined : effectiveCurrentServerUrl,
        path: newValue.path,
        // Only persist tag if it's NOT the latest (for non-latest tags only)
        tag: isLatestTag ? undefined : newValue.version.tag,
      }
      set(datasetSelectionAtom, selection)
    }
  },
})

export const hasSingleCurrentDatasetAtom = selector<boolean>({
  key: 'hasSingleCurrentDatasetAtom',
  get({ get }) {
    const datasetSingleCurrent = get(datasetSingleCurrentAtom)
    return datasetSingleCurrent != null && Object.keys(datasetSingleCurrent).length > 0
  },
})

// Legacy aliases for backward compatibility
export const currentDatasetAtom = datasetSingleCurrentAtom
export const resolvedDatasetAtom = datasetSingleCurrentAtom

export function createDatasetSelection(
  dataset: Dataset,
  serverUrl: string,
  latestDatasets: Dataset[],
): DatasetSelection | undefined {
  if (!dataset.path || !dataset.version?.tag) {
    return undefined
  }

  const defaultServerUrl = process.env.DATA_FULL_DOMAIN ?? '/'

  // Check if this is the latest version for this path
  const latestDataset = latestDatasets.find((d) => d.path === dataset.path)
  const isLatestTag = latestDataset?.version?.tag === dataset.version.tag

  return {
    // Only set serverUrl if it's not the default (for persistence)
    serverUrl: serverUrl === defaultServerUrl ? undefined : serverUrl,
    path: dataset.path,
    // Only persist tag if it's NOT the latest (for non-latest tags only)
    tag: isLatestTag ? undefined : dataset.version.tag,
  }
}

// const datasetsCurrentStorageAtom = atom<Dataset[] | undefined>({
//   key: 'datasetsCurrentStorage',
//   default: undefined,
//   effects: [persistAtom],
// })
//
// export const datasetsCurrentAtom = selector<Dataset[] | undefined>({
//   key: 'datasetsCurrent',
//   get({ get }) {
//     return get(datasetsCurrentStorageAtom)
//   },
//   set({ set, reset }, datasets: Dataset[] | undefined | DefaultValue) {
//     if (isDefaultValue(datasets) || isNil(datasets)) {
//       reset(autodetectResultsAtom)
//       reset(datasetsCurrentStorageAtom)
//     } else {
//       set(datasetsCurrentStorageAtom, datasets)
//     }
//   },
// })

export const datasetNamesForAnalysisAtom = atom<string[] | undefined>({
  key: 'datasetNamesForAnalysisAtom',
  default: undefined,
})

export const datasetsForAnalysisAtom = selector<Dataset[] | undefined>({
  key: 'datasetsForAnalysisAtom',
  get({ get }) {
    const datasetNamesForAnalysis = get(datasetNamesForAnalysisAtom)
    const datasets = get(datasetsAtom)
    return datasetNamesForAnalysis
      ?.map((datasetName) => datasets.find((dataset) => datasetName === dataset.path))
      .filter(notUndefinedOrNull)
  },
})

export const numDatasetsForAnalysisAtom = selector<number | undefined>({
  key: 'numDatasetsForAnalysisAtom',
  get({ get }) {
    return get(datasetsForAnalysisAtom)?.length
  },
})

export const hasMultipleDatasetsForAnalysisAtom = selector<boolean | undefined>({
  key: 'hasMultipleDatasetsForAnalysisAtom',
  get({ get }) {
    return mapMaybe(get(numDatasetsForAnalysisAtom), (n) => n > 1)
  },
})

export const viewedDatasetNameAtom = atom<string>({
  key: 'viewedDatasetNameAtom',
  default: undefined,
})

export const isViewedDatasetUnknownAtom = selector<boolean>({
  key: 'viewedDatasetIsUnknownAtom',
  get({ get }) {
    return get(viewedDatasetNameAtom) === UNKNOWN_DATASET_NAME
  },
})

export const datasetUpdatedAtom = atomFamily<Dataset | undefined, { datasetName: string }>({
  key: 'datasetUpdated',
  default: undefined,
})

export const [cdsOrderPreferenceAtom, allCdsOrderPreferenceAtom] = multiAtom<string[], { datasetName: string }>({
  key: 'cdsOrderPreferenceAtom',
})

export const minimizerIndexVersionAtom = atom<MinimizerIndexVersion | undefined>({
  key: 'minimizerIndexVersionAtom',
  default: undefined,
})

export const isSingleDatasetTabActiveAtom = atom({
  key: 'isSingleDatasetTabActiveAtom',
  default: true,
  effects: [persistAtom],
})
