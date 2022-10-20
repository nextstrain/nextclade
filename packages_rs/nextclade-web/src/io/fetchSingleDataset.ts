import type { ParsedUrlQuery } from 'querystring'

import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { fetchSingleDatasetFromUrl } from 'src/io/fetchSingleDatasetFromUrl'
import { isGithubUrlOrShortcut, parseGitHubRepoUrlOrShortcut } from 'src/io/fetchSingleDatasetFromGithub'

export async function fetchSingleDataset(urlQuery: ParsedUrlQuery) {
  const datasetUrl = getQueryParamMaybe(urlQuery, 'dataset-url')

  if (!datasetUrl) {
    return undefined
  }

  if (isGithubUrlOrShortcut(datasetUrl)) {
    const { owner, repo, branch, path } = await parseGitHubRepoUrlOrShortcut(datasetUrl)
    const datasetGithubRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    return fetchSingleDatasetFromUrl(datasetGithubRawUrl, { datasetOriginalUrl: datasetUrl })
  }

  return fetchSingleDatasetFromUrl(datasetUrl)
}
