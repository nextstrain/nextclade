import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import type { Router } from 'next/router'
import type { Dispatch } from 'redux'

import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import { AlgorithmInputString } from 'src/io/AlgorithmInput'
import { errorAdd } from 'src/state/error/error.actions'
import { algorithmRunWithSequencesAsync, setIsDirty, setRootSeq, setTree } from 'src/state/algorithm/algorithm.actions'

export class HttpRequestError extends Error {
  public readonly request: AxiosRequestConfig
  public readonly response?: AxiosResponse

  constructor(error_: AxiosError) {
    super(error_.message)
    this.request = error_.config
    this.response = error_.response
  }
}

export interface FetchParams {
  url?: string
  dispatch: Dispatch
}

export async function fetchMaybe(url?: string): Promise<string | undefined> {
  if (url) {
    const { data } = await Axios.get<string | undefined>(url, { transformResponse: [] })
    return data
  }
  return undefined
}

export async function fetchInputsAndRunMaybe(dispatch: Dispatch, router: Router) {
  const inputFastaUrl = takeFirstMaybe(router.query?.['input-fasta'])
  const inputRootSeqUrl = takeFirstMaybe(router.query?.['input-root-seq'])
  const inputTreeUrl = takeFirstMaybe(router.query?.['input-tree'])

  let inputFasta: string | undefined
  let inputRootSeqDangerous: string | undefined
  let inputTreeDangerous: string | undefined

  try {
    inputFasta = await fetchMaybe(inputFastaUrl)
    inputRootSeqDangerous = await fetchMaybe(inputRootSeqUrl)
    inputTreeDangerous = await fetchMaybe(inputTreeUrl)
  } catch (error_) {
    const error = new HttpRequestError(error_ as AxiosError)
    console.error(error)
    dispatch(errorAdd({ error }))
  }

  // TODO: we could use AlgorithmInputUrl instead. User experience should be improved: e.g. show progress indicator
  if (inputRootSeqDangerous) {
    dispatch(setRootSeq.trigger(new AlgorithmInputString(inputRootSeqDangerous)))
  }

  if (inputTreeDangerous) {
    dispatch(setTree.trigger(new AlgorithmInputString(inputTreeDangerous)))
  }

  if (inputFasta) {
    dispatch(setIsDirty(true))
    dispatch(algorithmRunWithSequencesAsync.trigger(new AlgorithmInputString(inputFasta)))
    await router.replace('/results')
  }
}
