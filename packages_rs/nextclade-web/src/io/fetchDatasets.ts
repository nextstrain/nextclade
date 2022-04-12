import type { Dispatch, Store } from 'redux'
import type { ParsedUrlQuery } from 'querystring'

import type { State } from 'src/state/reducer'
import type { DatasetFlat } from 'src/algorithms/types'
import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParam } from 'src/io/fetchInputsAndRunMaybe'
import { setCurrentDataset, setDatasets } from 'src/state/algorithm/algorithm.actions'
import { errorAdd } from 'src/state/error/error.actions'

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

export async function getLastUsedDataset(store: Store<State>, datasets: DatasetFlat[]) {
  const state = store.getState()
  const { lastDataset } = state.settings
  if (!lastDataset) {
    return undefined
  }

  const datasetName = lastDataset.name
  const datasetRef = lastDataset.reference?.accession
  const datasetTag = lastDataset.tag
  return findDataset(datasets, datasetName, datasetRef, datasetTag)
}

export async function initializeDatasets(dispatch: Dispatch, urlQuery: ParsedUrlQuery, store: Store<State>) {
  let datasets
  let defaultDatasetName
  let defaultDatasetNameFriendly

  try {
    const datasetsIndexJson = await fetchDatasetsIndex()
    ;({ datasets, defaultDatasetName, defaultDatasetNameFriendly } = getLatestCompatibleEnabledDatasets(
      datasetsIndexJson,
    ))

    if (!datasets || !defaultDatasetName || !defaultDatasetNameFriendly) {
      return false
    }

    // Check if URL params specify dataset params and try to find the corresponding dataset
    let dataset = await getDatasetFromUrlParams(urlQuery, datasets)

    // If URL params defined no dataset, try to restore the last used dataset from local storage
    if (!dataset) {
      dataset = await getLastUsedDataset(store, datasets)
    }

    dispatch(setDatasets({ defaultDatasetName, defaultDatasetNameFriendly, datasets }))
    if (dataset) {
      dispatch(setCurrentDataset(dataset))
    }
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      dispatch(errorAdd({ error }))
    } else {
      dispatch(errorAdd({ error: new Error('Unknown error') }))
    }
    return false
  }

  return true
}
