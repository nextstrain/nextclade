/* eslint-disable prefer-template */
import type { ParsedUrlQuery } from 'querystring'
import pMemoize from 'p-memoize'

import { getQueryParamMaybe } from 'src/io/getQueryParamMaybe'
import { removeLeadingAndTrailing, removeTrailingSlash } from 'src/io/url'
import { fetchSingleDatasetFromUrl } from 'src/io/fetchSingleDatasetFromUrl'
import { axiosFetch } from 'src/io/axiosFetch'
import { sanitizeError } from 'src/helpers/sanitizeError'

// eslint-disable-next-line no-underscore-dangle
export async function githubRepoGetDefaultBranch_(owner: string, repo: string): Promise<string> {
  try {
    const { default_branch } = await axiosFetch<{ default_branch: string }>( // eslint-disable-line camelcase
      `https://api.github.com/repos/${owner}/${repo}`,
    )
    return default_branch // eslint-disable-line camelcase
  } catch (error_) {
    const error = sanitizeError(error_)
    throw new ErrorGithubDefaultBranchRequestFailed(error, {
      owner,
      repo,
    })
  }
}

export const githubRepoGetDefaultBranch = pMemoize(githubRepoGetDefaultBranch_)

export interface GitHubRepoUrlComponents {
  owner: string
  repo: string
  branch: string
  path: string
}

export async function parseGitHubRepoUrl(datasetGithubUrl_: string): Promise<GitHubRepoUrlComponents | undefined> {
  const datasetGithubUrl = removeTrailingSlash(datasetGithubUrl_)

  const GITHUB_URL_REGEX =
    // eslint-disable-next-line security/detect-unsafe-regex
    /^https?:\/\/github.com\/(?<owner>.*?)\/(?<repo>.*?)\/(?<pathType>tree|branch?)\/(?<branch>.*?)(\/?<path>.*?)?\/?$/

  const match = GITHUB_URL_REGEX.exec(datasetGithubUrl)
  if (!match?.groups) {
    return undefined
  }

  const { owner, repo, branch } = match.groups
  if (!owner || !repo || !branch) {
    throw new ErrorDatasetGithubUrlComponentsInvalid(datasetGithubUrl, { owner, repo, branch })
  }

  const path = match.groups.path ?? '/'
  return { owner, repo, branch, path }
}

export async function parseGitHubRepoShortcut(datasetGithubUrl_: string): Promise<GitHubRepoUrlComponents | undefined> {
  const datasetGithubUrl = removeTrailingSlash(datasetGithubUrl_)

  const GITHUB_URL_REGEX =
    // eslint-disable-next-line security/detect-unsafe-regex
    /^github:(?<owner>[^/@]+)\/(?<repo>[^/@]+)(?<branch>@.+?@)?(?<path>\/.*)?$/

  const match = GITHUB_URL_REGEX.exec(datasetGithubUrl)
  if (!match?.groups) {
    return undefined
  }

  const { owner, repo } = match.groups
  if (!owner || !repo) {
    throw new ErrorDatasetGithubUrlComponentsInvalid(datasetGithubUrl, { owner, repo })
  }

  let path = match.groups.path ?? '//'
  path = removeTrailingSlash(path)

  let branch = match.groups.branch ?? (await githubRepoGetDefaultBranch(owner, repo))
  branch = removeLeadingAndTrailing(branch, '@')

  return { owner, repo, branch, path }
}

export async function parseGitHubRepoUrlOrShortcut(datasetGithubUrl_: string): Promise<GitHubRepoUrlComponents> {
  const datasetGithubUrl = removeTrailingSlash(datasetGithubUrl_)

  const urlComponents =
    (await parseGitHubRepoShortcut(datasetGithubUrl_)) ?? (await parseGitHubRepoUrl(datasetGithubUrl_))

  if (!urlComponents) {
    throw new ErrorDatasetGithubUrlPatternInvalid(datasetGithubUrl)
  }

  return urlComponents
}

export async function fetchSingleDatasetFromGithubRepo(urlQuery: ParsedUrlQuery) {
  const datasetGithubUrl = getQueryParamMaybe(urlQuery, 'dataset-github')

  if (!datasetGithubUrl) {
    return undefined
  }

  const { owner, repo, branch, path } = await parseGitHubRepoUrlOrShortcut(datasetGithubUrl)

  const datasetGithubRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`

  return fetchSingleDatasetFromUrl(datasetGithubRawUrl, { datasetOriginalUrl: datasetGithubUrl })
}

const GITHUB_URL_EXAMPLE =
  'https://github.com/nextstrain/nextclade_data/tree/master/data/datasets/flu_yam_ha/references/JN993010/versions/2022-07-27T12:00:00Z/files'

const GITHUB_URL_ERROR_HINTS = ` Check the correctness of the URL. If you don't intend to use custom dataset, remove the parameter from the address or restart the application. An example of a correct URL: '${GITHUB_URL_EXAMPLE}'`

export class ErrorDatasetGithubUrlPatternInvalid extends Error {
  public readonly datasetGithubUrl: string

  constructor(datasetGithubUrl: string) {
    super(
      `Dataset GitHub URL (provided using 'dataset-github' URL parameter) is invalid: '${datasetGithubUrl}'.` +
        GITHUB_URL_ERROR_HINTS,
    )
    this.datasetGithubUrl = datasetGithubUrl
  }
}

export class ErrorDatasetGithubUrlComponentsInvalid extends Error {
  public readonly datasetGithubUrl: string
  public readonly parsedRepoUrlComponents: Partial<GitHubRepoUrlComponents>

  constructor(datasetGithubUrl: string, parsedRepoUrlComponents: Partial<GitHubRepoUrlComponents>) {
    const componentsListStr = Object.entries(parsedRepoUrlComponents)
      .map(([key, val]) => `${key}='${val}'`)
      .join(',')

    super(
      `Dataset GitHub URL (provided using 'dataset-github' URL parameter) is invalid: '${datasetGithubUrl}'.` +
        ` Detected the following components ${componentsListStr}.` +
        GITHUB_URL_ERROR_HINTS,
    )
    this.datasetGithubUrl = datasetGithubUrl
    this.parsedRepoUrlComponents = parsedRepoUrlComponents
  }
}

export class ErrorGithubDefaultBranchRequestFailed extends Error {
  public readonly owner: string
  public readonly repo: string

  constructor(cause: Error, { owner, repo }: { owner: string; repo: string }) {
    super(`Unable to retrieve default branch of repository '${owner}/${repo}' from GitHub: ${cause.message}.`)
    this.cause = cause
    this.owner = owner
    this.repo = repo
  }
}
