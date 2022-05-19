import serializeJavascript from 'serialize-javascript'
import { ErrorInternal } from 'src/helpers/ErrorInternal'

export function sanitizeError(error: unknown): Error {
  if (!(error instanceof Error)) {
    const str = serializeJavascript(error, { space: 2, ignoreFunction: true })
    return new ErrorInternal(`There was an error, but error object was not recognized: "${str}"`)
  }

  return error
}
