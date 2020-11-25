import type { Router } from 'next/router'
import type { Dispatch } from 'redux'
import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
// import { treeValidate } from 'src/algorithms/tree/treeValidate'
// import { AlgorithmInputString } from 'src/algorithms/types'

// import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
// import { algorithmRunAsync, setIsDirty, setRootSeq } from 'src/state/algorithm/algorithm.actions'
// import { errorAdd } from 'src/state/error/error.actions'
// import { sanitizeRootSeq } from 'src/helpers/sanitizeRootSeq'

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

export async function fetchMaybe<T>(url?: string) {
  if (url) {
    const { data } = await Axios.get<T | undefined>(url)
    return data
  }
  return undefined
}

export async function fetchInputsAndRunMaybe(dispatch: Dispatch, router: Router) {
  // const inputFastaUrl = takeFirstMaybe(router.query?.['input-fasta'])
  // const inputRootSeqUrl = takeFirstMaybe(router.query?.['input-root-seq'])
  // const inputTreeUrl = takeFirstMaybe(router.query?.['input-tree'])
  //
  // let inputFasta: string | undefined
  // let inputRootSeqDangerous: string | undefined
  // let inputTreeDangerous: string | undefined
  //
  // try {
  //   inputFasta = await fetchMaybe(inputFastaUrl)
  //   inputRootSeqDangerous = await fetchMaybe(inputRootSeqUrl)
  //   inputTreeDangerous = await fetchMaybe(inputTreeUrl)
  // } catch (error_) {
  //   const error = new HttpRequestError(error_ as AxiosError)
  //   console.error(error)
  //   dispatch(errorAdd({ error }))
  // }
  //
  // if (inputRootSeqDangerous) {
  //   const inputRootSeq = sanitizeRootSeq(inputRootSeqDangerous)
  //   dispatch(setRootSeq(new AlgorithmInputString(inputRootSeq)))
  // }
  //
  // if (inputTreeDangerous) {
  //   const inputTree = treeValidate(inputTreeDangerous)
  //   dispatch(setTree(new AlgorithmInputString(inputTree)))
  // }
  //
  // if (inputFasta) {
  //   dispatch(setIsDirty(true))
  //   dispatch(algorithmRunAsync.trigger())
  //   await router.replace('/results')
  // }
}
