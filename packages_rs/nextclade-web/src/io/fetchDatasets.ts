import type { ParsedUrlQuery } from 'querystring'

import { Dataset } from 'src/types'
import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { datasetsAtom, datasetServerUrlAtom } from 'src/state/dataset.state'
import { useQuery } from 'react-query'

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
      refetchInterval: 12 * 60 * 60 * 1000, // 12 hours
      refetchIntervalInBackground: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  )
}
