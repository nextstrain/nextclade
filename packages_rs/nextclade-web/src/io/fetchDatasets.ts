import type { ParsedUrlQuery } from 'querystring'

import type { DatasetFlat } from 'src/algorithms/types'
import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParam } from 'src/io/fetchInputsAndRunMaybe'

export async function getDatasetFromUrlParams(urlQuery: ParsedUrlQuery, datasets: DatasetFlat[]) {
  const inputFastaUrl = getQueryParam(urlQuery, 'input-fasta')

  // If there are no input sequences, then skip the rest of URL params
  if (!inputFastaUrl) {
    return undefined
  }

  // Retrieve dataset-related URL params and try to find a dataset based on these params
  const datasetName = getQueryParam(urlQuery, 'dataset-name')

  if (!datasetName) {
    throw new Error(
      "Incorrect URL parameters: 'input-fasta' is set, but 'dataset-name' is not. " +
        "Nextclade won't run to avoid producing incorrect results. " +
        "Please set 'dataset-name' explicitly in the URL parameters",
    )
  }

  const datasetRef = getQueryParam(urlQuery, 'dataset-reference')
  const datasetTag = getQueryParam(urlQuery, 'dataset-tag')

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

  // TODO
  // // If URL params defined no dataset, try to restore the last used dataset from local storage
  // if (!currentDataset) {
  //   currentDataset = await getLastUsedDataset(store, datasets)
  // }

  const currentDatasetName = currentDataset?.name

  return { datasets, defaultDatasetName, defaultDatasetNameFriendly, currentDatasetName }
}
