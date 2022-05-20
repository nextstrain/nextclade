import { atom, DefaultValue, selector } from 'recoil'

import type { DatasetFlat } from 'src/algorithms/types'
import { persistAtom } from 'src/state/persist/localStorage'
import { viewedGeneAtom } from 'src/state/settings.state'
import { isDefaultValue } from './results.state'

export interface Datasets {
  datasets: DatasetFlat[]
  defaultDatasetName: string
  defaultDatasetNameFriendly: string
}

export const datasetsAtom = atom<Datasets>({
  key: 'datasets',
})

const datasetCurrentNameStorageAtom = atom<string | undefined>({
  key: 'datasetCurrentNameStorage',
  default: undefined,
  effects: [persistAtom],
})

export const datasetCurrentNameAtom = selector<string | undefined>({
  key: 'datasetCurrentName',
  get({ get }) {
    return get(datasetCurrentNameStorageAtom)
  },
  set({ get, set, reset }, datasetCurrentName: string | undefined | DefaultValue) {
    if (isDefaultValue(datasetCurrentName)) {
      reset(datasetCurrentNameStorageAtom)
    } else {
      const { datasets } = get(datasetsAtom)
      const dataset = datasets.find((dataset) => dataset.name === datasetCurrentName)
      if (dataset) {
        set(datasetCurrentNameStorageAtom, dataset.name)
        set(viewedGeneAtom, dataset.defaultGene)
      }
    }
  },
})

export const datasetCurrentAtom = selector<DatasetFlat | undefined>({
  key: 'datasetCurrent',
  get({ get }) {
    const { datasets } = get(datasetsAtom)
    const datasetCurrentName = get(datasetCurrentNameAtom)
    return datasets.find((dataset) => dataset.name === datasetCurrentName)
  },
})

export const geneOrderPreferenceAtom = selector({
  key: 'geneOrderPreference',
  get({ get }) {
    return get(datasetCurrentAtom)?.geneOrderPreference ?? []
  },
})
