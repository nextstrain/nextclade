import { Saga } from 'redux-saga'
import { all, call, put } from 'redux-saga/effects'

import { errorAdd } from './error/error.actions'

import algorithmExportSagas from './algorithm/algorithmExport.sagas'
import algorithmInputsSagas from './algorithm/algorithmInputs.sagas'
import algorithmRunSagas from './algorithm/algorithmRun.sagas'
import settingsSaga from './settings/settings.sagas'

function autoRestart(generator: Saga, handleError: Saga<[Error]>) {
  return function* autoRestarting() {
    while (true) {
      try {
        yield call(generator)
        break
      } catch (error) {
        yield handleError(error)
      }
    }
  }
}

function* rootSaga() {
  yield all([...algorithmExportSagas, ...algorithmInputsSagas, ...algorithmRunSagas, ...settingsSaga])
}

function* rootErrorHandler(error: Error) {
  console.error(error.message)
  yield put(errorAdd({ error }))
}

export default function createRootSaga() {
  return autoRestart(rootSaga, rootErrorHandler)
}
