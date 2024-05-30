import { isNil } from 'lodash'
import { atom, DefaultValue, selector } from 'recoil'
import { autodetectResultsAtom } from 'src/state/autodetect.state'
import type { Dataset, MinimizerIndexVersion } from 'src/types'
import { persistAtom } from 'src/state/persist/localStorage'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'

export interface Datasets {
  datasets: Dataset[]
}

export const datasetServerUrlAtom = atom<string>({
  key: 'datasetServerUrlAtom',
})

export const datasetsAtom = atom<Datasets>({
  key: 'datasets',
})

const datasetCurrentStorageAtom = atom<Dataset | undefined>({
  key: 'datasetCurrentStorage',
  default: undefined,
  effects: [persistAtom],
})

export const datasetCurrentAtom = selector<Dataset | undefined>({
  key: 'datasetCurrent',
  get({ get }) {
    return get(datasetCurrentStorageAtom)
  },
  set({ set, reset }, dataset: Dataset | undefined | DefaultValue) {
    if (isDefaultValue(dataset) || isNil(dataset)) {
      reset(autodetectResultsAtom)
      reset(datasetCurrentStorageAtom)
    } else {
      set(datasetCurrentStorageAtom, dataset)
    }
  },
})

export const datasetUpdatedAtom = atom<Dataset | undefined>({
  key: 'datasetUpdated',
  default: undefined,
})

export const cdsOrderPreferenceAtom = atom<string[]>({
  key: 'cdsOrderPreferenceAtom',
  default: [],
})

export const minimizerIndexVersionAtom = atom<MinimizerIndexVersion | undefined>({
  key: 'minimizerIndexVersionAtom',
  default: undefined,
})
