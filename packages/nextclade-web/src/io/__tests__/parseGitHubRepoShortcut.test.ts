import { DEFAULT_DATA_OWNER, DEFAULT_DATA_REPO, DEFAULT_DATA_REPO_PATH } from 'src/constants'
import { getTestName } from 'src/helpers/jestUtils'
import { parseGitHubRepoShortcut } from 'src/io/fetchSingleDatasetFromGithub'

describe('parseGitHubRepoShortcut', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV, BRANCH_NAME: 'default-branch' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('gh', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: DEFAULT_DATA_OWNER,
      repo: DEFAULT_DATA_REPO,
      branch: 'default-branch',
      path: DEFAULT_DATA_REPO_PATH,
    })
  })

  it('gh:', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: DEFAULT_DATA_OWNER,
      repo: DEFAULT_DATA_REPO,
      branch: 'default-branch',
      path: DEFAULT_DATA_REPO_PATH,
    })
  })

  it('gh:@test-branch@', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: DEFAULT_DATA_OWNER,
      repo: DEFAULT_DATA_REPO,
      branch: 'test-branch',
      path: DEFAULT_DATA_REPO_PATH,
    })
  })

  it('gh:aaa/bbb', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'default-branch',
      path: '/',
    })
  })

  it('gh:aaa/bbb/', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'default-branch',
      path: '/',
    })
  })

  it('gh:aaa/bbb@test-branch@', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir/', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir/', async () => {
    expect(await parseGitHubRepoShortcut(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })
})
