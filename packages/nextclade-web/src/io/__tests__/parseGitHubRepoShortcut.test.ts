import { DEFAULT_DATA_OWNER, DEFAULT_DATA_REPO, DEFAULT_DATA_REPO_PATH } from 'src/constants'
import { parseGitHubRepoShortcut } from 'src/io/fetchSingleDatasetFromGithub'

// No network in unit tests: the GitHub API request for the default branch of a repository fails
vi.mock('src/io/axiosFetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/io/axiosFetch')>()),
  axiosFetch: vi.fn().mockRejectedValue(new Error('Network requests are disabled in unit tests')),
}))

describe('parseGitHubRepoShortcut', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...OLD_ENV, BRANCH_NAME: 'default-branch' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('gh', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: DEFAULT_DATA_OWNER,
      repo: DEFAULT_DATA_REPO,
      branch: 'default-branch',
      path: DEFAULT_DATA_REPO_PATH,
      originalUrl: task.name,
      directUrl: `https://raw.githubusercontent.com/${DEFAULT_DATA_OWNER}/${DEFAULT_DATA_REPO}/default-branch/${DEFAULT_DATA_REPO_PATH}`,
    })
  })

  it('gh:', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: DEFAULT_DATA_OWNER,
      repo: DEFAULT_DATA_REPO,
      branch: 'default-branch',
      path: DEFAULT_DATA_REPO_PATH,
      originalUrl: task.name,
      directUrl: `https://raw.githubusercontent.com/${DEFAULT_DATA_OWNER}/${DEFAULT_DATA_REPO}/default-branch/${DEFAULT_DATA_REPO_PATH}`,
    })
  })

  it('gh:@test-branch@', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: DEFAULT_DATA_OWNER,
      repo: DEFAULT_DATA_REPO,
      branch: 'test-branch',
      path: DEFAULT_DATA_REPO_PATH,
      originalUrl: task.name,
      directUrl: `https://raw.githubusercontent.com/${DEFAULT_DATA_OWNER}/${DEFAULT_DATA_REPO}/test-branch/${DEFAULT_DATA_REPO_PATH}`,
    })
  })

  it('gh:aaa/bbb', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'master',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/master/',
    })
  })

  it('gh:aaa/bbb/', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'master',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/master/',
    })
  })

  it('gh:aaa/bbb@test-branch@', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/',
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir/', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir/', async ({ task }) => {
    expect(await parseGitHubRepoShortcut(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir',
    })
  })
})
