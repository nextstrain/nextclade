import { parseGithubRepoUrlComponents } from 'src/io/fetchSingleDatasetFromGithub'

describe('parseGithubRepoUrlComponents', () => {
  it('https://github.com/aaa/bbb', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname/', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/tree/test-branch/dirname//', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname//',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: '/',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/filename.json', async ({ task }) => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/filename.json',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/blob/branch/slashes/dirname/filename.json', async ({ task }) => {
    // NOTE: for URLs in this format there is no way to tell where branch name ends and where path starts.
    //  So we assume first component is the branch and the remainder are the path.
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch',
      path: 'slashes/dirname/filename.json',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname/', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname/',
      originalUrl: task.name,
    })
  })

  it('https://github.com/aaa/bbb/blob/test-branch/dirname//', async ({ task }) => {
    expect(parseGithubRepoUrlComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'dirname//',
      originalUrl: task.name,
    })
  })
})
