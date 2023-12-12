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
    const { directUrl } = await parseGitHubRepoUrlOrShortcut(datasetUrl)
    return fetchSingleDatasetFromUrl(directUrl, { datasetOriginalUrl: datasetUrl })
  }
  return fetchSingleDatasetFromUrl(datasetUrl)
}
