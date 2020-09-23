import type { Router } from 'next/router'
import type { Dispatch } from 'redux'
import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import { algorithmRunAsync, setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { errorAdd } from 'src/state/error/error.actions'

export class HttpRequestError extends Error {
  public readonly request: AxiosRequestConfig
  public readonly response?: AxiosResponse

  constructor(error_: AxiosError) {
    super(error_.message)
    this.request = error_.config
    this.response = error_.response
  }
}

export async function fetchInputsAndRunMaybe(dispatch: Dispatch, router: Router) {
  const inputFastaUrl = takeFirstMaybe(router.query?.['input-fasta'])
  if (inputFastaUrl) {
    try {
      const { data } = await Axios.get<string | undefined>(inputFastaUrl)
      if (data) {
        dispatch(setIsDirty(true))
        dispatch(algorithmRunAsync.trigger(data))
        await router.replace('/results')
      }
    } catch (error_) {
      const error = new HttpRequestError(error_ as AxiosError)
      console.error(error)
      dispatch(errorAdd({ error }))
    }
  }
}
