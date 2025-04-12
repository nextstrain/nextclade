/* eslint-disable import/no-cycle */
import { isNil } from 'lodash'
import { atom, atomFamily, DefaultValue, selector, selectorFamily } from 'recoil'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { autodetectResultsAtom } from 'src/state/autodetect.state'
import { multiAtom } from 'src/state/utils/multiAtom'
import { Dataset, MinimizerIndexVersion } from 'src/types'
import { persistAtom } from 'src/state/persist/localStorage'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'

export const datasetServerUrlAtom = atom<string>({
  key: 'datasetServerUrlAtom',
})

export const datasetsAtom = atom<Dataset[]>({
  key: 'datasets',
  default: [],
})

export const datasetAtom = selectorFamily<Dataset, { datasetName: string }>({
  key: 'dataset',
  get:
    ({ datasetName }) =>
    ({ get }) => {
      const datasets = get(datasetsAtom)
      const dataset = datasets.find((dataset) => dataset.path === datasetName)
      if (!dataset) {
        throw new ErrorInternal(`Dataset '${datasetName}' not found`)
      }
      return dataset
    },
})

const datasetsCurrentStorageAtom = atom<Dataset[] | undefined>({
  key: 'datasetsCurrentStorage',
  default: undefined,
  effects: [persistAtom],
})

export const datasetsCurrentAtom = selector<Dataset[] | undefined>({
  key: 'datasetsCurrent',
  get({ get }) {
    return get(datasetsCurrentStorageAtom)
  },
  set({ set, reset }, datasets: Dataset[] | undefined | DefaultValue) {
    if (isDefaultValue(datasets) || isNil(datasets)) {
      reset(autodetectResultsAtom)
      reset(datasetsCurrentStorageAtom)
    } else {
      set(datasetsCurrentStorageAtom, datasets)
    }
  },
})

export const viewedDatasetNameAtom = atom<string>({
  key: 'viewedDatasetName',
  default: undefined,
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
