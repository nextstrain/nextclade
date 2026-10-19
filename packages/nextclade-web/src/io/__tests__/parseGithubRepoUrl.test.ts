import { parseGithubRepoUrl } from 'src/io/fetchSingleDatasetFromGithub'

// No network in unit tests: the GitHub API request for the default branch of a repository fails
vi.mock('src/io/axiosFetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/io/axiosFetch')>()),
  axiosFetch: vi.fn().mockRejectedValue(new Error('Network requests are disabled in unit tests')),
}))

describe('parseGithubRepoUrl', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...OLD_ENV, BRANCH_NAME: 'default-branch' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('https://github.com/aaa/bbb', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'master',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/master/',
    })
  })

  it('https://github.com/aaa/bbb/', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'master',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/master/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname/', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname//', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/filename.json', async ({ task }) => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/filename.json',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname/filename.json',
    })
  })

  it('https://github.com/aaa/bbb/blob/branch/slashes/dirname/filename.json', async ({ task }) => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch',
      path: 'slashes/dirname/filename.json',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/branch/slashes/dirname/filename.json',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname//', async ({ task }) => {
    expect(await parseGithubRepoUrl(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
      directUrl: 'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    })
  })
})
