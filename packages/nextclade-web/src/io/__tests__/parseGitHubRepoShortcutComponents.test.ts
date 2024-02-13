import { getTestName } from 'src/helpers/jestUtils'
import { parseGitHubRepoShortcutComponents } from 'src/io/fetchSingleDatasetFromGithub'

describe('parseGitHubRepoShortcutComponents', () => {
  it('gh', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: undefined,
      repo: undefined,
      branch: undefined,
      path: undefined,
    })
  })

  it('gh:', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: undefined,
      repo: undefined,
      branch: undefined,
      path: undefined,
    })
  })

  it('gh:@test-branch@', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: undefined,
      repo: undefined,
      branch: 'test-branch',
      path: undefined,
    })
  })

  it('gh:aaa/bbb', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: undefined,
    })
  })

  it('gh:aaa/bbb/', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: '/',
    })
  })

  it('gh:aaa/bbb@test-branch@', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: undefined,
    })
  })

  it('gh:aaa/bbb@branch/slashes@', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/slashes',
      path: undefined,
    })
  })

  it('gh:aaa/bbb@branch/more/slashes@', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/more/slashes',
      path: undefined,
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@branch/slashes@/my/path/dir', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/slashes',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@branch/more/slashes@/my/path/dir', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'branch/more/slashes',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@my/path/dir/', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb@test-branch@/my/path/dir/', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: 'test-branch',
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb/my/path/dir', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: 'my/path/dir',
    })
  })

  it('gh:aaa/bbb/my/path/dir/', async () => {
    expect(parseGitHubRepoShortcutComponents(getTestName())).toStrictEqual({
      owner: 'aaa',
      repo: 'bbb',
      branch: undefined,
      path: 'my/path/dir',
    })
  })
})
