import { put, select, takeEvery } from 'redux-saga/effects'
import { push } from 'connected-next-router'

import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

import { locateInTree } from 'src/algorithms/tree/locateInTree'
import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'
import { prepareResultsJson } from 'src/io/serializeResults'

import { selectResults } from 'src/state/algorithm/algorithm.selectors'
import type { AuspiceState } from 'src/state/auspice/auspice.state'
import { auspiceStartClean, showTree } from 'src/state/auspice/auspice.actions'

import auspiceTree from 'src/assets/data/ncov_small.json'

export function* showTreeSaga() {
  const results = (yield select(selectResults) as unknown) as ReturnType<typeof selectResults>
  const data = prepareResultsJson(results)
  const json = locateInTree(data, auspiceTree, DEFAULT_ROOT_SEQUENCE)
  const state: AuspiceState = createStateFromQueryOrJSONs({ json, query: {} })
  yield put(auspiceStartClean(state))
  yield put(push('/tree'))
}

export default [takeEvery(showTree, showTreeSaga)]
