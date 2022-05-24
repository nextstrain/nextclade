import type { ParsedUrlQuery } from 'querystring'
import { Dataset } from 'src/algorithms/types'

import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'

export async function getDatasetFromUrlParams(urlQuery: ParsedUrlQuery, datasets: Dataset[]) {
  const inputFastaUrl = getQueryParamMaybe(urlQuery, 'input-fasta')

  // If there are no input sequences, we are not going to run, so skip the rest
  if (!inputFastaUrl) {
    return undefined
  }

  // Retrieve dataset-related URL params and try to find a dataset based on these params
  const datasetName = getQueryParamMaybe(urlQuery, 'dataset-name')

  if (!datasetName) {
    throw new Error(
      "Incorrect URL parameters: 'input-fasta' is set, but 'dataset-name' is not. " +
        "Nextclade won't run to avoid producing incorrect results. " +
        "Please set 'dataset-name' explicitly in the URL parameters",
    )
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

export async function initializeDatasets(urlQuery: ParsedUrlQuery) {
  const datasetsIndexJson = await fetchDatasetsIndex()

  const { datasets, defaultDatasetName, defaultDatasetNameFriendly } =
    getLatestCompatibleEnabledDatasets(datasetsIndexJson)

  // Check if URL params specify dataset params and try to find the corresponding dataset
  const currentDataset = await getDatasetFromUrlParams(urlQuery, datasets)

  const currentDatasetName = currentDataset?.attributes.name.value

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }
}
