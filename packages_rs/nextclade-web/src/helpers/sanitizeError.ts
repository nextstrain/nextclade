import serializeJavascript from 'serialize-javascript'
import { PROJECT_NAME } from 'src/constants'
import { ErrorInternal } from 'src/helpers/ErrorInternal'

export function sanitizeError(error: unknown): Error {
  if (!(error instanceof Error)) {
    const str = serializeJavascript(error, { space: 2, ignoreFunction: true })
    return new ErrorInternal(
      `There was an error and ${PROJECT_NAME} was unable to recognize this error type. This is what we know so far: "${str}"`,
    )
  }

  return error
}
