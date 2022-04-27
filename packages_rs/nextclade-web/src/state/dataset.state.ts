import { atom, selector } from 'recoil'

import type { DatasetFlat } from 'src/algorithms/types'

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
})

export const datasetCurrentAtom = selector<DatasetFlat | undefined>({
  key: 'datasetCurrent',
  get({ get }) {
    const datasetsObj = get(datasetsAtom)
    if (!datasetsObj) {
      return undefined
    }
    const { datasets } = datasetsObj
    const datasetCurrentName = get(datasetCurrentNameAtom)
    return datasets.find((dataset) => dataset.name === datasetCurrentName)
  },
})
