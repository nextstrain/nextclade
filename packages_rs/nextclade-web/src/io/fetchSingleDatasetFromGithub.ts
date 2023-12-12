/* eslint-disable security/detect-unsafe-regex,prefer-const */
import { isEmpty, isNil, trim } from 'lodash'
import pMemoize from 'p-memoize'
import { DEFAULT_DATA_OWNER, DEFAULT_DATA_REPO, DEFAULT_DATA_REPO_PATH } from 'src/constants'
import { removeTrailingSlash } from 'src/io/url'
import { axiosFetch } from 'src/io/axiosFetch'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { Optional } from 'utility-types'

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
  originalUrl: string
  owner: string
  repo: string
  branch: string
  path: string
}

export interface GitHubRepoUrlResult extends GitHubRepoUrlComponents {
  directUrl: string
}

export function parseGithubRepoUrlComponents(url: string): Optional<GitHubRepoUrlComponents> {
  // NOTE: for URLs in format
  //    <https://github.com/owner/repo/blob> / <branch/with/slashes> / <dirname/filename.json>
  //  there is no way to tell where branch name ends and where path starts.
  //  So we assume first component is the branch and the remainder are the path, but this is not universal.

  const GITHUB_URL_REGEX =
    /^(?:https?:\/\/)?github\.com\/+(?<owner>[^/]+)\/+(?<repo>[^/]+)(?:\/+(tree|blob)\/+(?<branch>[^/]+)(?:\/*(?<path>.+))?)?\/*$/
  const match = GITHUB_URL_REGEX.exec(url)
  const { owner, repo, branch, path } = match?.groups ?? {}
  return { owner, repo, branch, path, originalUrl: url }
}

export async function parseGithubRepoUrl(url_: string): Promise<GitHubRepoUrlResult> {
  const url = removeTrailingSlash(url_)
  let { owner, repo, path, branch } = parseGithubRepoUrlComponents(url)

  // If owner and repo are omitted, use official data repo
  if (!owner || !repo) {
    throw new ErrorDatasetGithubUrlComponentsInvalid(url, { owner, repo, branch, path })
  } else if (!branch) {
    try {
      branch = await githubRepoGetDefaultBranch(owner, repo)
    } catch {
      branch = 'master'
    }
  }

  path = trim(path, '/')
  if (isNil(path) || isEmpty(path)) {
    path = '/'
  }

  const directUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  return { owner, repo, branch, path, directUrl, originalUrl: url_ }
}

export function parseGitHubRepoShortcutComponents(shortcut: string): Optional<GitHubRepoUrlComponents> {
  const GITHUB_URL_REGEX =
    /^(gh|github):((?<owner>[^/@]+)\/(?<repo>[^/@]+))?(@(?<branch>[^@]+)@?)?(\/*(?<path>[^@]+?)\/*)?$/
  const match = GITHUB_URL_REGEX.exec(shortcut)
  const { owner, repo, branch, path } = match?.groups ?? {}
  return { owner, repo, branch, path, originalUrl: shortcut }
}

export async function parseGitHubRepoShortcut(shortcut: string): Promise<GitHubRepoUrlResult> {
  const datasetGithubUrl = removeTrailingSlash(shortcut)
  let { owner, repo, branch, path } = parseGitHubRepoShortcutComponents(datasetGithubUrl)

  // If owner and repo are omitted, use official data repo
  if (!owner || !repo) {
    owner = DEFAULT_DATA_OWNER
    repo = DEFAULT_DATA_REPO
  } else if (!branch) {
    try {
      branch = await githubRepoGetDefaultBranch(owner, repo)
    } catch {
      branch = 'master'
    }
  }

  if (!branch) {
    if (owner === DEFAULT_DATA_OWNER && repo === DEFAULT_DATA_REPO) {
      branch = process.env.BRANCH_NAME ?? 'master'
    } else {
      try {
        branch = await githubRepoGetDefaultBranch(owner, repo)
      } catch {
        branch = 'master'
      }
    }
  }

  // If path is omitted and owner and repo point to the official data repo, then use the default data repo path
  if (!path && owner === DEFAULT_DATA_OWNER && repo === DEFAULT_DATA_REPO) {
    path = DEFAULT_DATA_REPO_PATH
  }

  path = path && path !== '/' && path !== '' ? trim(path, '/') : '/'
  const directUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  return { owner, repo, branch, path, originalUrl: shortcut, directUrl }
}

export async function parseGitHubRepoUrlOrShortcut(datasetGithubUrl_: string): Promise<GitHubRepoUrlResult> {
  const datasetGithubUrl = removeTrailingSlash(datasetGithubUrl_)

  const urlComponents =
    (await parseGitHubRepoShortcut(datasetGithubUrl_)) ?? (await parseGithubRepoUrl(datasetGithubUrl_))

  if (!urlComponents) {
    throw new ErrorDatasetGithubUrlPatternInvalid(datasetGithubUrl)
  }

  let { owner, repo, branch, path } = urlComponents
  const directUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  return { owner, repo, branch, path, directUrl, originalUrl: datasetGithubUrl_ }
}

export function isGithubUrl(url: string): boolean {
  return !isNil(/^https?:\/\/github.com\/.*/.exec(url))
}

export function isGithubShortcut(url: string): boolean {
  return !isNil(/^(github|gh).*/.exec(url))
}

export function isGithubUrlOrShortcut(url: string): boolean {
  return isGithubUrl(url) || isGithubShortcut(url)
}

const GITHUB_URL_ERROR_HINTS = ` Check the correctness of the URL. If it's a full GitHub URL, please try to navigate to it - you should see a GitHub repo branch with your files listed. If it's a GitHub URL shortcut, please double-check the syntax. See documentation for the correct syntax and examples. If you don't intend to use custom datasets, remove the parameter from the address or restart the application.`

export class ErrorDatasetGithubUrlPatternInvalid extends Error {
  public readonly datasetGithubUrl: string

  constructor(datasetGithubUrl: string) {
    super(`Dataset GitHub URL is invalid: '${datasetGithubUrl}'.${GITHUB_URL_ERROR_HINTS}`)
    this.datasetGithubUrl = datasetGithubUrl
  }
}

export class ErrorDatasetGithubUrlComponentsInvalid extends Error {
  public readonly datasetGithubUrl: string
  public readonly parsedRepoUrlComponents: Partial<GitHubRepoUrlComponents>

  constructor(datasetGithubUrl: string, parsedRepoUrlComponents: Partial<GitHubRepoUrlComponents>) {
    const componentsListStr = Object.entries(parsedRepoUrlComponents)
      .map(([key, val]) => `${key}='${val}'`)
      .join(', ')

    super(
      `Dataset GitHub URL is invalid: '${datasetGithubUrl}'. Detected the following components ${componentsListStr}.${GITHUB_URL_ERROR_HINTS}`,
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
