/* eslint-disable import/no-cycle */
import { isNil } from 'lodash'
import { atom, atomFamily, DefaultValue, selector } from 'recoil'
import { autodetectResultsAtom } from 'src/state/autodetect.state'
import { multiAtom } from 'src/state/utils/multiAtom'
import type { Dataset, MinimizerIndexVersion } from 'src/types'
import { persistAtom } from 'src/state/persist/localStorage'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'

export const datasetServerUrlAtom = atom<string>({
  key: 'datasetServerUrlAtom',
})

export const datasetsAtom = atom<Dataset[]>({
  key: 'datasets',
  default: [],
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

export const isSingleDatasetTabActiveAtom = atom({
  key: 'isSingleDatasetTabActiveAtom',
  default: true,
  effects: [persistAtom],
})
