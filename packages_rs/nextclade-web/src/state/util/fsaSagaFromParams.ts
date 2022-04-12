import { identity } from 'lodash'

import type { AsyncActionCreators } from 'src/state/util/fsaActions'
import { call, cancelled, put, SagaGenerator } from 'typed-redux-saga'

import { sanitizeError } from 'src/helpers/sanitizeError'

export function fsaSagaFromParams<Params, Result, TransformedResult = Result>(
  asyncActionCreators: AsyncActionCreators<Params, TransformedResult, Error>,
  worker: (params: Params) => SagaGenerator<Result>,
  resultTransformer: (result: Result) => TransformedResult = identity,
) {
  return function* wrappedSaga(params: Params) {
    // Dispatch "started" action
    yield* put(asyncActionCreators.started(params))

    try {
      // Call worker
      const result = yield* call(worker, params)

      // Worker succeeded. Dispatch action of type "done" with results payload.
      // If transformer is supplied, transform the results before dispatching, otherwise dispatch as is.
      const transformedResult = resultTransformer(result)
      yield* put(asyncActionCreators.done({ params, result: transformedResult }))

      // Return untransformed result
      return result
    } catch (error_) {
      // Worker failed. Print error and dispatch an action of type "failed" with error payload.
      const error = sanitizeError(error_)
      console.error(error)
      yield* put(asyncActionCreators.failed({ params, error }))
    } finally {
      // Worker was cancelled (e.g. manually or as a result of multiple incoming `takeLatest()`).
      // Dispatch an action of type "failed" with the special error value.
      if (yield* cancelled()) {
        yield* put(asyncActionCreators.cancelled({ params }))
      }
    }
    return undefined
  }
}
