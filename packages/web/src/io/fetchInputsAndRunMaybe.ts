import type { Dispatch } from 'redux'
import type { ParsedUrlQuery } from 'querystring'

import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import { AlgorithmInputString } from 'src/io/AlgorithmInput'
import { axiosFetchRaw } from 'src/io/axiosFetch'
import { errorAdd } from 'src/state/error/error.actions'
import { algorithmRunAsync, setInputUrlParams, setIsDirty } from 'src/state/algorithm/algorithm.actions'

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

  dispatch(
    setInputUrlParams({
      inputRootSeq: inputRootSeqUrl,
      inputTree: inputTreeUrl,
      inputPcrPrimers: inputPcrPrimersUrl,
      inputQcConfig: inputQcConfigUrl,
      inputGeneMap: inputGeneMapUrl,
    }),
  )

  if (inputFastaUrl) {
    try {
      const inputFasta = await axiosFetchRaw(inputFastaUrl)
      dispatch(setIsDirty(true))
      dispatch(algorithmRunAsync.trigger(new AlgorithmInputString(inputFasta, inputFastaUrl)))
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        dispatch(errorAdd({ error }))
      } else {
        dispatch(errorAdd({ error: new Error('Unknown error') }))
      }
      return false
    }
  }

  return true
}
