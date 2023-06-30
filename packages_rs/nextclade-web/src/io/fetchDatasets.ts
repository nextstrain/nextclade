import type { ParsedUrlQuery } from 'querystring'

import { Dataset } from 'src/types'
import {
  fetchDatasetsIndex,
  filterDatasets,
  findDataset,
  getLatestCompatibleEnabledDatasets,
} from 'src/io/fetchDatasetsIndex'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { datasetCurrentAtom, datasetsAtom, datasetServerUrlAtom, datasetUpdatedAtom } from 'src/state/dataset.state'
import { useQuery } from 'react-query'
import { isNil } from 'lodash'

export async function getDatasetFromUrlParams(urlQuery: ParsedUrlQuery, datasets: Dataset[]) {
  // Retrieve dataset-related URL params and try to find a dataset based on these params
  const datasetName = getQueryParamMaybe(urlQuery, 'dataset-name')

  if (!datasetName) {
    return undefined
  }

  const datasetRef = getQueryParamMaybe(urlQuery, 'dataset-reference')
  const datasetTag = getQueryParamMaybe(urlQuery, 'dataset-tag')

  const dataset = findDataset(datasets, datasetName, datasetRef, datasetTag)
  if (!dataset) {
    throw new Error(
      `Incorrect URL parameters: unable to find dataset with name='${datasetName}', ref='${datasetRef ?? ''}', tag='${
        datasetTag ?? ''
      }' `,
    )
  }

  return dataset
}

export async function initializeDatasets(urlQuery: ParsedUrlQuery, datasetServerUrlDefault: string) {
  const datasetServerUrl = getQueryParamMaybe(urlQuery, 'dataset-server') ?? datasetServerUrlDefault

  const datasetsIndexJson = await fetchDatasetsIndex(datasetServerUrl)

  const { datasets, defaultDataset, defaultDatasetName, defaultDatasetNameFriendly } =
    getLatestCompatibleEnabledDatasets(datasetServerUrl, datasetsIndexJson)

  // Check if URL params specify dataset params and try to find the corresponding dataset
  const currentDataset = await getDatasetFromUrlParams(urlQuery, datasets)

  return { datasets, defaultDataset, defaultDatasetName, defaultDatasetNameFriendly, currentDataset }
}

/** Refetch dataset index periodically and update the local copy of if */
export function useUpdatedDatasetIndex() {
  const setDatasetsState = useSetRecoilState(datasetsAtom)
  const datasetServerUrl = useRecoilValue(datasetServerUrlAtom)
  useQuery(
    'refetchDatasetIndex',
    async () => {
      const { currentDataset: _, ...datasetsState } = await initializeDatasets({}, datasetServerUrl)
      setDatasetsState(datasetsState)
    },
    {
      suspense: false,
      staleTime: 0,
      refetchInterval: 2 * 60 * 60 * 1000, // 2 hours
      refetchIntervalInBackground: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  )
}

/**
 * Check currently selected dataset against **local** dataset index periodically and store updated dataset locally.
 * If an updated dataset is stored, user will receive a notification.
 */
export function useUpdatedDataset() {
  const { datasets } = useRecoilValue(datasetsAtom)
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const setDatasetUpdated = useSetRecoilState(datasetUpdatedAtom)

  useQuery(
    'currentDatasetState',
    async () => {
      const name = datasetCurrent?.attributes.name.value
      const refAccession = datasetCurrent?.attributes.reference.value
      const tag = datasetCurrent?.attributes.tag.value
      if (!isNil(name) && !isNil(refAccession) && !isNil(tag)) {
        const candidateDatasets = filterDatasets(datasets, name, refAccession)
        const updatedDataset = candidateDatasets.find((candidate) => {
          const candidateTag = candidate.attributes.tag.value
          return candidateTag > tag
        })
        setDatasetUpdated(updatedDataset)
      }
      return undefined
    },
    {
      suspense: false,
      staleTime: 0,
      refetchInterval: 60 * 60 * 1000, // 1 hour
      refetchIntervalInBackground: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  )
}
