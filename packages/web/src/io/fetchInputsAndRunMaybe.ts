import type { Dispatch } from 'redux'
import type { ParsedUrlQuery } from 'querystring'

import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import { AlgorithmInputString } from 'src/io/AlgorithmInput'
import { axiosFetchRawMaybe } from 'src/io/axiosFetch'
import { errorAdd } from 'src/state/error/error.actions'
import {
  algorithmRunAsync,
  setGeneMap,
  setIsDirty,
  setPcrPrimers,
  setQcSettings,
  setRootSeq,
  setTree,
} from 'src/state/algorithm/algorithm.actions'

export function getQueryParam(urlQuery: ParsedUrlQuery, param: string): string | undefined {
  return takeFirstMaybe(urlQuery?.[param]) ?? undefined
}

export async function fetchInputsAndRunMaybe(dispatch: Dispatch, urlQuery: ParsedUrlQuery) {
  const inputFastaUrl = getQueryParam(urlQuery, 'input-fasta')
  const inputRootSeqUrl = getQueryParam(urlQuery, 'input-root-seq')
  const inputTreeUrl = getQueryParam(urlQuery, 'input-tree')
  const inputPcrPrimersUrl = getQueryParam(urlQuery, 'input-pcr-primers')
  const inputQcConfigUrl = getQueryParam(urlQuery, 'input-qc-config')
  const inputGeneMapUrl = getQueryParam(urlQuery, 'input-gene-map')

  let inputFasta: string | undefined
  let inputRootSeq: string | undefined
  let inputTree: string | undefined
  let inputPcrPrimers: string | undefined
  let inputQcConfig: string | undefined
  let inputGeneMap: string | undefined

  let hasError = false

  try {
    ;[inputFasta, inputRootSeq, inputTree, inputPcrPrimers, inputQcConfig, inputGeneMap] = await Promise.all([
      axiosFetchRawMaybe(inputFastaUrl),
      axiosFetchRawMaybe(inputRootSeqUrl),
      axiosFetchRawMaybe(inputTreeUrl),
      axiosFetchRawMaybe(inputPcrPrimersUrl),
      axiosFetchRawMaybe(inputQcConfigUrl),
      axiosFetchRawMaybe(inputGeneMapUrl),
    ])
  } catch (error) {
    console.error(error)
    if (error instanceof Error) {
      dispatch(errorAdd({ error }))
    } else {
      dispatch(errorAdd({ error: new Error('Unknown error') }))
    }
    hasError = true
  }

  if (hasError) {
    return false
  }

  // TODO: we could use AlgorithmInputUrl instead. User experience should be improved: e.g. show progress indicator
  if (inputRootSeq) {
    dispatch(setRootSeq.trigger(new AlgorithmInputString(inputRootSeq, inputRootSeqUrl)))
  }

  if (inputTree) {
    dispatch(setTree.trigger(new AlgorithmInputString(inputTree, inputTreeUrl)))
  }

  if (inputPcrPrimers) {
    dispatch(setPcrPrimers.trigger(new AlgorithmInputString(inputPcrPrimers, inputPcrPrimersUrl)))
  }

  if (inputQcConfig) {
    dispatch(setQcSettings.trigger(new AlgorithmInputString(inputQcConfig, inputQcConfigUrl)))
  }

  if (inputGeneMap) {
    dispatch(setGeneMap.trigger(new AlgorithmInputString(inputGeneMap, inputGeneMapUrl)))
  }

  if (inputFasta) {
    dispatch(setIsDirty(true))
    dispatch(algorithmRunAsync.trigger(new AlgorithmInputString(inputFasta, inputFastaUrl)))
  }

  return true
}
