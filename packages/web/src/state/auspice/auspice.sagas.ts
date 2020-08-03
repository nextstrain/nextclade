import type { AuspiceState } from 'auspice'
import { put, select, takeEvery } from 'redux-saga/effects'
import { push } from 'connected-next-router'

import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

import { locateInTree } from 'src/algorithms/tree/locateInTree'
import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'

import { selectResults } from 'src/state/algorithm/algorithm.selectors'
import { auspiceStartClean, showTree } from 'src/state/auspice/auspice.actions'

export function* showTreeSaga() {
  const results = (yield select(selectResults) as unknown) as ReturnType<typeof selectResults>
  const json = locateInTree(results, DEFAULT_ROOT_SEQUENCE)
  const state: AuspiceState = createStateFromQueryOrJSONs({ json, query: {} })
  yield put(auspiceStartClean(state))
  yield put(push('/tree'))
}

export default [takeEvery(showTree, showTreeSaga)]
