import { getTestName } from 'src/helpers/jestUtils'
import { parseGithubRepoUrlComponents } from 'src/io/fetchSingleDatasetFromGithub'

describe('parseGithubRepoUrlComponents', () => {
  it('https://github.com/aaa/bbb', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: undefined,
    })
  })

  it('https://github.com/aaa/bbb/', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: undefined,
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: undefined,
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname/', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/',
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname//', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname//',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: undefined,
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/filename.json', async () => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/filename.json',
    })
  })

  it('https://github.com/aaa/bbb/blob/branch/slashes/dirname/filename.json', async () => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch',
      path: 'slashes/dirname/filename.json',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/',
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname//', async () => {
    expect(parseGithubRepoUrlComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname//',
    })
  })
})
