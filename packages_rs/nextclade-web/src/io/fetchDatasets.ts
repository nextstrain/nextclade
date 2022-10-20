import type { ParsedUrlQuery } from 'querystring'

import { Dataset } from 'src/types'
import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'

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

  const { datasets, defaultDatasetName, defaultDatasetNameFriendly } = getLatestCompatibleEnabledDatasets(
    datasetServerUrl,
    datasetsIndexJson,
  )

  // Check if URL params specify dataset params and try to find the corresponding dataset
  const currentDataset = await getDatasetFromUrlParams(urlQuery, datasets)

  const currentDatasetName = currentDataset?.attributes.name.value

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }
}
