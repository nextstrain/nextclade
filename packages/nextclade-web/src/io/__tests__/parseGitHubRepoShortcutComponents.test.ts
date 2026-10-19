import { parseGitHubRepoShortcutComponents } from 'src/io/fetchSingleDatasetFromGithub'

describe('parseGitHubRepoShortcutComponents', () => {
  it('gh', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: undefined,
      repo: undefined,
      branch: undefined,
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('gh:', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: undefined,
      repo: undefined,
      branch: undefined,
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('gh:@test-branch@', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: undefined,
      repo: undefined,
      branch: 'test-branch',
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb/', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: '/',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@test-branch@', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@branch/slashes@', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/slashes',
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@branch/more/slashes@', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/more/slashes',
      path: undefined,
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@branch/slashes@/my/path/dir', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/slashes',
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@branch/more/slashes@/my/path/dir', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/more/slashes',
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir/', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir/', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb/my/path/dir', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })

  it('gh:aaa/bbb/my/path/dir/', async ({ task }) => {
    expect(parseGitHubRepoShortcutComponents(task.name)).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: 'my/path/dir',
      originalUrl: task.name,
    })
  })
})
