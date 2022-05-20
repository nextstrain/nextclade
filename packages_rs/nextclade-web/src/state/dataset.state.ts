import { atom, selector } from 'recoil'

import type { DatasetFlat } from 'src/algorithms/types'
import { persistAtom } from 'src/state/persist/localStorage'

export interface Datasets {
  datasets: DatasetFlat[]
  defaultDatasetName: string
  defaultDatasetNameFriendly: string
}

export const datasetsAtom = atom<Datasets>({
  key: 'datasets',
})

export const datasetCurrentNameAtom = atom<string | undefined>({
  key: 'datasetCurrentName',
  default: undefined,
  effects: [persistAtom],
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
