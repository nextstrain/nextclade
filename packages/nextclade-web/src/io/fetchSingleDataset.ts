import type { ParsedUrlQuery } from 'querystring'
import { ErrorFatal } from 'src/helpers/ErrorFatal'
import { fetchSingleDatasetAuspice } from 'src/io/fetchSingleDatasetAuspice'
import { fetchSingleDatasetDirectory } from 'src/io/fetchSingleDatasetDirectory'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { isGithubUrlOrShortcut, parseGitHubRepoUrlOrShortcut } from 'src/io/fetchSingleDatasetFromGithub'

export async function fetchSingleDataset(urlQuery: ParsedUrlQuery) {
  const datasetUrl = getQueryParamMaybe(urlQuery, 'dataset-url')
  const datasetUrlJson = getQueryParamMaybe(urlQuery, 'dataset-json-url')

  if (datasetUrl && datasetUrlJson) {
    throw new ErrorFatal(
      "URL parameters 'dataset-url' and 'dataset-url-json' are mutually exclusive, but both provided. Please remove one or the other.",
    )
  }

  let finalUrl
  let options
  let fetchFunction

  if (datasetUrl) {
    finalUrl = datasetUrl
    fetchFunction = fetchSingleDatasetDirectory
  } else if (datasetUrlJson) {
    finalUrl = datasetUrlJson
    fetchFunction = fetchSingleDatasetAuspice
  } else {
    return undefined
  }

  if (isGithubUrlOrShortcut(finalUrl)) {
    const { directUrl } = await parseGitHubRepoUrlOrShortcut(finalUrl)
    options = { datasetOriginalUrl: finalUrl }
    finalUrl = directUrl
  }

  return fetchFunction(finalUrl, options)
}
