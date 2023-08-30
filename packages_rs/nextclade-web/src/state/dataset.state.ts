import { isNil } from 'lodash'
import { atom, DefaultValue, selector } from 'recoil'
import urljoin from 'url-join'

import type { Dataset } from 'src/types'
// import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'
import { inputResetAtom } from 'src/state/inputs.state'
import { persistAtom } from 'src/state/persist/localStorage'
// import { viewedGeneAtom } from 'src/state/seqViewSettings.state'
import { isDefaultValue } from 'src/state/utils/isDefaultValue'
import { areDatasetsEqual } from 'src/types'

export function getDefaultDatasetServer(): string {
  let datasetServerUrl = process.env.DATA_FULL_DOMAIN ?? '/'
  // Add HTTP Origin if datasetServerUrl is a relative path (start with '/')
  if (typeof window !== 'undefined' && datasetServerUrl.slice(0) === '/') {
    datasetServerUrl = urljoin(window.location.origin, datasetServerUrl)
  }
  return datasetServerUrl
}

export const datasetServerUrlAtom = atom<string>({
  key: 'datasetServerUrl',
  default: getDefaultDatasetServer(),
})

export interface Datasets {
  datasets: Dataset[]
}

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
  set({ get, set, reset }, dataset: Dataset | undefined | DefaultValue) {
    const datasetCurrent = get(datasetCurrentStorageAtom)
    if (isDefaultValue(dataset) || isNil(dataset)) {
      reset(datasetCurrentStorageAtom)
    } else if (!areDatasetsEqual(datasetCurrent, dataset)) {
      set(datasetCurrentStorageAtom, dataset)
      // FIXME
      // set(viewedGeneAtom, dataset?.defaultGene ?? GENE_OPTION_NUC_SEQUENCE)
      reset(inputResetAtom)
    }
  },
})

export const datasetUpdatedAtom = atom<Dataset | undefined>({
  key: 'datasetUpdated',
  default: undefined,
})

export const geneOrderPreferenceAtom = selector({
  key: 'geneOrderPreference',
  // eslint-disable-next-line unused-imports/no-unused-vars
  get({ get }) {
    // FIXME
    // return get(datasetCurrentAtom)?.params?.geneOrderPreference ?? []
    return []
  },
})
