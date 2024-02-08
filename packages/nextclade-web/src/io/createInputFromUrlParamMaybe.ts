import { concurrent } from 'fasy'
import type { ParsedUrlQuery } from 'querystring'

import { AlgorithmInputDefault, AlgorithmInputUrl } from 'src/io/AlgorithmInput'
import { isGithubUrlOrShortcut, parseGitHubRepoUrlOrShortcut } from 'src/io/fetchSingleDatasetFromGithub'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { takeArray } from 'src/helpers/takeFirstMaybe'
import { AlgorithmInput, Dataset } from 'src/types'
import { isString } from 'lodash'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export async function createInputFromUrlParamMaybe(urlQuery: ParsedUrlQuery, paramName: string) {
  const url = getQueryParamMaybe(urlQuery, paramName)
  if (!url) {
    return undefined
  }
  if (isGithubUrlOrShortcut(url)) {
    const { directUrl } = await parseGitHubRepoUrlOrShortcut(url)
    return new AlgorithmInputUrl(directUrl)
  }
  return new AlgorithmInputUrl(url)
}

export async function createInputFastasFromUrlParam(
  urlQuery: ParsedUrlQuery,
  dataset: Dataset | undefined,
): Promise<AlgorithmInput[]> {
  const urls = takeArray(urlQuery?.['input-fasta'])
  const inputs = await concurrent.map(async (url) => {
    if (url === 'example') {
      return dataset ? new AlgorithmInputDefault(dataset) : undefined
    }
    if (isString(url)) {
      if (isGithubUrlOrShortcut(url)) {
        const { directUrl } = await parseGitHubRepoUrlOrShortcut(url)
        return new AlgorithmInputUrl(directUrl)
      }
      return new AlgorithmInputUrl(url)
    }
    return undefined
  }, urls)
  return inputs.filter(notUndefinedOrNull)
}
