import { AxiosError } from 'axios'
import type { Router } from 'next/router'
import type { Dispatch } from 'redux'

import { AlgorithmInputString, HttpRequestError } from 'src/io/AlgorithmInput'
import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import { fetchMaybe } from 'src/io/fetchMaybe'
import { showResultsAsync } from 'src/state/algorithm/algorithm.actions'
import { errorAdd } from 'src/state/error/error.actions'

export async function fetchResultsAndShowMaybe(dispatch: Dispatch, router: Router) {
  const inputResultsJsonUrl = takeFirstMaybe(router.query?.['results-json'])
  let inputResultsJsonDangerous: string | undefined
  let hasError = false

  try {
    inputResultsJsonDangerous = await fetchMaybe(inputResultsJsonUrl)
  } catch (error_) {
    const error = new HttpRequestError(error_ as AxiosError)
    console.error(error)
    dispatch(errorAdd({ error }))
    hasError = true
  }

  if (hasError) {
    return
  }

  if (inputResultsJsonDangerous) {
    dispatch(showResultsAsync.trigger(new AlgorithmInputString(inputResultsJsonDangerous, inputResultsJsonUrl)))

    await router.replace('/results')
  }
}
