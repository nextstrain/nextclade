import type { AuspiceState } from 'auspice'
import { put, select, takeEvery } from 'redux-saga/effects'
import { push } from 'connected-next-router'

import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

import { selectTree } from 'src/state/algorithm/algorithm.selectors'
import { auspiceStartClean, showTree } from 'src/state/auspice/auspice.actions'

export function* showTreeSaga() {
  const json = (yield select(selectTree) as unknown) as ReturnType<typeof selectTree>
  const state: AuspiceState = createStateFromQueryOrJSONs({ json, query: {} })
  yield put(auspiceStartClean(state))
  yield put(push('/tree'))
}

export default [takeEvery(showTree, showTreeSaga)]
