import { getTestName } from 'src/helpers/jestUtils'
import { parseGithubRepoUrl } from 'src/io/fetchSingleDatasetFromGithub'

describe('parseGithubRepoUrl', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV, BRANCH_NAME: 'default-branch' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('https://github.com/aaa/bbb', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'master',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'master',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname/', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname//', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/filename.json', async () => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/filename.json',
    })
  })

  it('https://github.com/aaa/bbb/blob/branch/slashes/dirname/filename.json', async () => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch',
      path: 'slashes/dirname/filename.json',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname//', async () => {
    expect(await parseGithubRepoUrl(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })
})
