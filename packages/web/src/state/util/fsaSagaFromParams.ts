import type { AsyncActionCreators } from 'typescript-fsa'
import { call, cancelled, put, SagaGenerator } from 'typed-redux-saga'

import { sanitizeError } from 'src/helpers/sanitizeError'

export function fsaSagaFromParams<Params, Result, TransformedResult>(
  asyncActionCreators: AsyncActionCreators<Params, TransformedResult, Error>,
  worker: (params: Params) => SagaGenerator<Result>,
  resultTransformer?: (result: Result) => TransformedResult,
) {
  return function* wrappedSaga(params: Params) {
    // Dispatch "started" action
    yield* put(asyncActionCreators.started(params))

    try {
      // Call worker
      const result = yield* call(worker, params)

      // Worker succeeded. Dispatch action of type "done" with results payload.
      // If transformer is supplied, transform the results before dispatching.
      if (resultTransformer) {
        const transformedResult = resultTransformer(result)
        yield* put(asyncActionCreators.done({ params, result: transformedResult }))
      }

      // Return untransformed result
      return result
    } catch (error_) {
      // Worker failed. Print error and dispatch an action of type "failed" with error payload.
      const error = sanitizeError(error_)
      console.error(error_)
      yield* put(asyncActionCreators.failed({ params, error }))
    } finally {
      // Worker was cancelled (e.g. manually or as a result of take*).
      // Dispatch an action of type "failed" with the special error value.
      if (yield* cancelled()) {
        const error = new Error('cancelled')
        yield* put(asyncActionCreators.failed({ params, error }))
      }
    }
    return undefined
  }
}
