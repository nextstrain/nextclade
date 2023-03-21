import type { ParsedUrlQuery } from 'querystring'

import { AlgorithmInputDefault, AlgorithmInputUrl } from 'src/io/AlgorithmInput'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { takeArray } from 'src/helpers/takeFirstMaybe'
import { AlgorithmInput, Dataset } from 'src/types'
import { isString } from 'lodash'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export function createInputFromUrlParamMaybe(urlQuery: ParsedUrlQuery, paramName: string) {
  const url = getQueryParamMaybe(urlQuery, paramName)
  if (!url) {
    return undefined
  }
  return new AlgorithmInputUrl(url)
}

export function createInputFastasFromUrlParam(
  urlQuery: ParsedUrlQuery,
  dataset: Dataset | undefined,
): AlgorithmInput[] {
  const urls = takeArray(urlQuery?.['input-fasta'])
  const result = urls
    .map((url) => {
      if (url === 'example') {
        return dataset ? new AlgorithmInputDefault(dataset) : undefined
      }
      if (isString(url)) {
        return new AlgorithmInputUrl(url)
      }
      return undefined
    })
    .filter(notUndefinedOrNull)
  console.log('createInputFastasFromUrlParam', { urls, result })
  return result
}
