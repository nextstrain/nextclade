import { isNil } from 'lodash'
import pMemoize from 'p-memoize'
import { DEFAULT_DATA_OWNER, DEFAULT_DATA_REPO, DEFAULT_DATA_REPO_PATH } from 'src/constants'
import { removeLeadingAndTrailing, removeTrailingSlash } from 'src/io/url'
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
    /^(github|gh):((?<owner>[^/@]+)\/(?<repo>[^/@]+))?(?<branch>@.+?@)?(?<path>\/.*)?$/

  const match = GITHUB_URL_REGEX.exec(datasetGithubUrl)

  let { owner, repo } = match?.groups ?? {}
  let path = match?.groups?.path ?? '/data_output'
  path = removeTrailingSlash(path)

  let branch = match?.groups?.branch
  if (!branch) {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (owner && repo) {
      branch = await githubRepoGetDefaultBranch(owner, repo)
    } else {
      branch = process.env.BRANCH_NAME ?? 'BRANCH_IS_MISSING'
    }
  }
  branch = removeLeadingAndTrailing(branch, '@')

  // If owner and repo are omitted, use official data repo
  if (!owner && !repo) {
    owner = DEFAULT_DATA_OWNER
    repo = DEFAULT_DATA_REPO
  }

  // If path is omitted and owner and repo point to the official data repo, then use the default data repo path
  if (!path && owner === DEFAULT_DATA_OWNER && repo === DEFAULT_DATA_REPO) {
    path = DEFAULT_DATA_REPO_PATH
  }

  return { owner, repo, branch, path }
}

export async function parseGitHubRepoUrlOrShortcut(datasetGithubUrl_: string): Promise<GitHubRepoUrlComponents> {
  const datasetGithubUrl = removeTrailingSlash(datasetGithubUrl_)

  const urlComponents =
    (await parseGitHubRepoShortcut(datasetGithubUrl_)) ?? (await parseGitHubRepoUrl(datasetGithubUrl_))

  if (!urlComponents) {
    throw new ErrorDatasetGithubUrlPatternInvalid(datasetGithubUrl)
  }

  // eslint-disable-next-line prefer-const
  let { owner, repo, branch, path } = urlComponents

  return { owner, repo, branch, path }
}

export function isGithubUrlOrShortcut(url: string): boolean {
  return !isNil(/^(github|gh|https?:\/\/github.com).*/.exec(url))
}

const GITHUB_URL_ERROR_HINTS = ` Check the correctness of the URL. If it's a full GitHub URL, please try to navigate to it - you should see a GitHub repo branch with your files listed. If it's a GitHub URL shortcut, please double check the syntax. See documentation for the correct syntax and examples. If you don't intend to use custom datasets, remove the parameter from the address or restart the application.`

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
      .join(',')

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
