/* eslint-disable prefer-destructuring */
import type { ParsedUrlQuery } from 'querystring'
import { findSimilarStrings } from 'src/helpers/string'
import { axiosHeadOrUndefined } from 'src/io/axiosFetch'
import {
  isGithubShortcut,
  isGithubUrl,
  parseGitHubRepoShortcut,
  parseGithubRepoUrl,
} from 'src/io/fetchSingleDatasetFromGithub'

import { Dataset } from 'src/types'
import {
  fetchDatasetsIndex,
  filterDatasets,
  findDataset,
  getCompatibleMinimizerIndexVersion,
  getLatestCompatibleEnabledDatasets,
} from 'src/io/fetchDatasetsIndex'
import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import {
  datasetCurrentAtom,
  datasetsAtom,
  datasetServerUrlAtom,
  datasetUpdatedAtom,
  minimizerIndexVersionAtom,
} from 'src/state/dataset.state'
import { useQuery } from 'react-query'
import { isNil } from 'lodash'
import urljoin from 'url-join'
import { URL_GITHUB_DATA_RAW } from 'src/constants'

export async function getDatasetFromUrlParams(urlQuery: ParsedUrlQuery, datasets: Dataset[]) {
  // Retrieve dataset-related URL params and try to find a dataset based on these params
  const name = getQueryParamMaybe(urlQuery, 'dataset-name')

  if (!name) {
    return undefined
  }

  const tag = getQueryParamMaybe(urlQuery, 'dataset-tag')

  const dataset = findDataset(datasets, name, tag)

  if (!dataset) {
    const names = datasets.map((dataset) => dataset.path)
    const suggestions = findSimilarStrings(names, name)
      .slice(0, 10)
      .map((s) => `'${s}'`)
      .join(', ')
    const tagMsg = tag ? ` and tag '${tag}` : ''
    throw new Error(
      `Incorrect URL parameters: unable to find the dataset with name='${name}'${tagMsg}. Did you mean one of: ${suggestions}`,
    )
  }

  return dataset
}

export async function getGithubDatasetServerUrl(): Promise<string | undefined> {
  const BRANCH_NAME = process.env.BRANCH_NAME
  if (!BRANCH_NAME) {
    return undefined
  }

  const githubDatasetServerUrl = urljoin(URL_GITHUB_DATA_RAW, BRANCH_NAME, 'data_output')
  const githubIndexJsonUrl = urljoin(githubDatasetServerUrl, 'index.json')

  const headRes = await axiosHeadOrUndefined(githubIndexJsonUrl)

  if (headRes) {
    return githubDatasetServerUrl
  }

  return undefined
}

export function toAbsoluteUrl(url: string): string {
  if (typeof window !== 'undefined' && url.slice(0) === '/') {
    return urljoin(window.location.origin, url)
  }
  return url
}

export async function getDatasetServerUrl(urlQuery: ParsedUrlQuery) {
  // Get dataset URL from query URL params.
  let datasetServerUrl = getQueryParamMaybe(urlQuery, 'dataset-server')

  // If the URL is formatted as a GitHub URL or as a GitHub URL shortcut, use it without any checking
  if (datasetServerUrl) {
    if (isGithubShortcut(datasetServerUrl)) {
      const { owner, repo, branch, path } = await parseGitHubRepoShortcut(datasetServerUrl)
      return urljoin('https://raw.githubusercontent.com', owner, repo, branch, path)
    }

    if (isGithubUrl(datasetServerUrl)) {
      const { owner, repo, branch, path } = await parseGithubRepoUrl(datasetServerUrl)
      return urljoin('https://raw.githubusercontent.com', owner, repo, branch, path)
    }
  }

  // If requested to try GitHub-hosted datasets either using `DATA_TRY_GITHUB_BRANCH` env var (e.g. from
  // `.env` file), or using `&dataset-server=gh` or `&dataset-server=github` URL parameters, then check if the
  // corresponding branch in the default data repo on GitHub contains an `index.json` file. And if yes, use it.
  const datasetServerTryGithubBranch =
    (isNil(datasetServerUrl) && process.env.DATA_TRY_GITHUB_BRANCH === '1') ||
    (datasetServerUrl && ['gh', 'github'].includes(datasetServerUrl))
  if (datasetServerTryGithubBranch) {
    const githubDatasetServerUrl = await getGithubDatasetServerUrl()
    if (githubDatasetServerUrl) {
      datasetServerUrl = githubDatasetServerUrl
    }
  }

  // If none of the above, use hardcoded default URL (from `.env` file)
  datasetServerUrl = datasetServerUrl ?? process.env.DATA_FULL_DOMAIN ?? '/'

  // If the URL happens to be a relative path, then convert to absolute URL (on the app's current host)
  return toAbsoluteUrl(datasetServerUrl)
}

export async function initializeDatasets(datasetServerUrl: string, urlQuery: ParsedUrlQuery = {}) {
  const datasetsIndexJson = await fetchDatasetsIndex(datasetServerUrl)

  const { datasets } = getLatestCompatibleEnabledDatasets(datasetServerUrl, datasetsIndexJson)

  const minimizerIndexVersion = await getCompatibleMinimizerIndexVersion(datasetServerUrl, datasetsIndexJson)

  // Check if URL params specify dataset params and try to find the corresponding dataset
  const currentDataset = await getDatasetFromUrlParams(urlQuery, datasets)

  return { datasets, currentDataset, minimizerIndexVersion }
}

/** Refetch dataset index periodically and update the local copy of if */
export function useUpdatedDatasetIndex() {
  const datasetServerUrl = useRecoilValue(datasetServerUrlAtom)
  const setDatasetsState = useSetRecoilState(datasetsAtom)
  const setMinimizerIndexVersion = useSetRecoilState(minimizerIndexVersionAtom)

  useQuery(
    'refetchDatasetIndex',
    async () => {
      const { currentDataset: _, minimizerIndexVersion, ...datasets } = await initializeDatasets(datasetServerUrl)
      setDatasetsState(datasets)
      setMinimizerIndexVersion(minimizerIndexVersion)
    },
    {
      suspense: false,
      staleTime: 0,
      refetchInterval: 2 * 60 * 60 * 1000, // 2 hours
      refetchIntervalInBackground: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  )
}

/**
 * Check currently selected dataset against **local** dataset index periodically and store updated dataset locally.
 * If an updated dataset is stored, user will receive a notification.
 */
export function useUpdatedDataset() {
  const { datasets } = useRecoilValue(datasetsAtom)
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const setDatasetUpdated = useSetRecoilState(datasetUpdatedAtom)

  useQuery(
    'currentDatasetState',
    async () => {
      const path = datasetCurrent?.path
      const updatedAt = datasetCurrent?.version?.updatedAt
      if (!isNil(updatedAt)) {
        const candidateDatasets = filterDatasets(datasets, path)
        const updatedDataset = candidateDatasets.find((candidate) => {
          const candidateTag = candidate.version?.updatedAt
          return candidateTag && candidateTag > updatedAt
        })
        setDatasetUpdated(updatedDataset)
      }
      return undefined
    },
    {
      suspense: false,
      staleTime: 0,
      refetchInterval: 60 * 60 * 1000, // 1 hour
      refetchIntervalInBackground: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  )
}
