import type { Router } from 'next/router'
import type { Dispatch } from 'redux'
import Axios from 'axios'

import { takeFirstMaybe } from 'src/helpers/takeFirstMaybe'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { algorithmRunAsync, setIsDirty } from 'src/state/algorithm/algorithm.actions'
import { errorAdd } from 'src/state/error/error.actions'

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
      const error = sanitizeError(error_)
      console.error(error)
      dispatch(errorAdd({ error }))
    }
  }
}
