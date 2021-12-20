import type { Dispatch, Store } from 'redux'
import type { ParsedUrlQuery } from 'querystring'

import type { State } from 'src/state/reducer'
import { fetchDatasetsIndex, findDataset, getLatestCompatibleEnabledDatasets } from 'src/io/fetchDatasetsIndex'
import { getQueryParam } from 'src/io/fetchInputsAndRunMaybe'
import { setCurrentDataset, setDatasets } from 'src/state/algorithm/algorithm.actions'
import { errorAdd } from 'src/state/error/error.actions'

export async function initializeDatasets(dispatch: Dispatch, urlQuery: ParsedUrlQuery, store: Store<State>) {
  let datasets
  let defaultDatasetName
  let defaultDatasetNameFriendly
  let hasError

  try {
    const datasetsIndexJson = await fetchDatasetsIndex()
    ;({ datasets, defaultDatasetName, defaultDatasetNameFriendly } = getLatestCompatibleEnabledDatasets(
      datasetsIndexJson,
    ))
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      dispatch(errorAdd({ error }))
    } else {
      dispatch(errorAdd({ error: new Error('Unknown error') }))
    }
    hasError = true
  }

  if (hasError || !datasets || !defaultDatasetName || !defaultDatasetNameFriendly) {
    return false
  }

  const state = store.getState()
  const { lastDataset } = state.settings

  const datasetName = getQueryParam(urlQuery, 'dataset-name') ?? lastDataset?.name
  const datasetRef = getQueryParam(urlQuery, 'dataset-reference') ?? lastDataset?.reference.accession
  const datasetTag = getQueryParam(urlQuery, 'dataset-tag') ?? lastDataset?.tag

  const dataset = findDataset(datasets, datasetName, datasetRef, datasetTag)

  dispatch(setDatasets({ defaultDatasetName, defaultDatasetNameFriendly, datasets }))
  if (dataset) {
    dispatch(setCurrentDataset(dataset))
  }

  return true
}
