import { reducerWithInitialState } from 'typescript-fsa-reducers'

import { setParams } from './algorithm.actions'
import { agorithmDefaultState } from './algorithm.state'

import immerCase from '../util/fsaImmerReducer'

export const agorithmReducer = reducerWithInitialState(agorithmDefaultState).withHandling(
  immerCase(setParams, (draft, params) => {
    draft.params = params
  }),
)
