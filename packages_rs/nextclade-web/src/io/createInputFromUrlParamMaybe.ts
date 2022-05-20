import type { ParsedUrlQuery } from 'querystring'

import { AlgorithmInputUrl } from 'src/io/AlgorithmInput'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'

export function createInputFromUrlParamMaybe(urlQuery: ParsedUrlQuery, paramName: string) {
  const url = getQueryParamMaybe(urlQuery, paramName)
  if (!url) {
    return undefined
  }
  return new AlgorithmInputUrl(url)
}
