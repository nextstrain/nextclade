import { isEmpty } from 'lodash'
import { atom, atomFamily, selector } from 'recoil'
import { mapMaybe, notUndefinedOrNull } from 'src/helpers/notUndefined'
import type { Dataset, MinimizerIndexVersion } from 'src/types'
import { multiAtom } from 'src/state/utils/multiAtom'
import { persistAtom } from 'src/state/persist/localStorage'

export const UNKNOWN_DATASET_NAME = '__UNKNOWN__' as const

export const datasetServerUrlAtom = atom<string>({
  key: 'datasetServerUrlAtom',
})

export const datasetsAtom = atom<Dataset[]>({
  key: 'datasets',
  default: [],
})

export const datasetSingleCurrentAtom = atom<Dataset | undefined>({
  key: 'datasetSingleCurrentAtom',
  default: undefined,
  effects: [persistAtom],
})

export const hasSingleCurrentDatasetAtom = selector<boolean>({
  key: 'hasSingleCurrentDatasetAtom',
  get({ get }) {
    return !isEmpty(get(datasetSingleCurrentAtom))
  },
})

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
