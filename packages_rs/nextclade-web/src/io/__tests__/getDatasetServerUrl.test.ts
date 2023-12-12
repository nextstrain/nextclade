import { getDatasetServerUrl } from 'src/io/fetchDatasets'

describe('parseGitHubRepoShortcut', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV, BRANCH_NAME: 'default-branch' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it.each([
    ['gh', 'https://raw.githubusercontent.com/nextstrain/nextclade_data/default-branch/data_output'],
    ['gh:', 'https://raw.githubusercontent.com/nextstrain/nextclade_data/default-branch/data_output'],
    ['gh', 'https://raw.githubusercontent.com/nextstrain/nextclade_data/default-branch/data_output'],
    ['gh:', 'https://raw.githubusercontent.com/nextstrain/nextclade_data/default-branch/data_output'],
    ['gh:@test-branch@', 'https://raw.githubusercontent.com/nextstrain/nextclade_data/test-branch/data_output'],
    ['gh:aaa/bbb', 'https://raw.githubusercontent.com/aaa/bbb/master/'],
    ['gh:aaa/bbb/', 'https://raw.githubusercontent.com/aaa/bbb/master/'],
    ['gh:aaa/bbb@test-branch@', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/'],
    ['gh:aaa/bbb@test-branch@my/path/dir', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir'],
    ['gh:aaa/bbb@test-branch@/my/path/dir', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir'],
    ['gh:aaa/bbb@test-branch@my/path/dir/', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir'],
    ['gh:aaa/bbb@test-branch@/my/path/dir/', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir'],
    ['gh:aaa/bbb@branch/slashes@/my/path/dir', 'https://raw.githubusercontent.com/aaa/bbb/branch/slashes/my/path/dir'],
    ['https://github.com/aaa/bbb', 'https://raw.githubusercontent.com/aaa/bbb/master/'],
    ['https://github.com/aaa/bbb/', 'https://raw.githubusercontent.com/aaa/bbb/master/'],
    ['https://github.com/aaa/bbb/tree/test-branch', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/'],
    ['https://github.com/aaa/bbb/tree/test-branch/', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/'],
    [
      'https://github.com/aaa/bbb/tree/test-branch/dirname',
      'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    ],
    [
      'https://github.com/aaa/bbb/tree/test-branch/dirname/',
      'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    ],
    [
      'https://github.com/aaa/bbb/tree/test-branch/dirname//',
      'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    ],
    ['https://github.com/aaa/bbb/blob/test-branch', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/'],
    ['https://github.com/aaa/bbb/blob/test-branch/', 'https://raw.githubusercontent.com/aaa/bbb/test-branch/'],
    [
      'https://github.com/aaa/bbb/blob/test-branch/dirname',
      'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    ],
    [
      'https://github.com/aaa/bbb/blob/test-branch/my/path/dir/',
      'https://raw.githubusercontent.com/aaa/bbb/test-branch/my/path/dir',
    ],
    [
      'https://github.com/aaa/bbb/blob/test-branch/dirname/filename.json',
      'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname/filename.json',
    ],
    [
      'https://github.com/aaa/bbb/blob/branch/slashes/dirname/filename.json',
      'https://raw.githubusercontent.com/aaa/bbb/branch/slashes/dirname/filename.json',
    ],
    [
      'https://github.com/aaa/bbb/blob/test-branch/dirname//',
      'https://raw.githubusercontent.com/aaa/bbb/test-branch/dirname',
    ],
    [
      'https://github.com/nextstrain/nextclade_data/tree/master/data_output/nextstrain/rsv/a/EPI_ISL_412866/unreleased',
      'https://raw.githubusercontent.com/nextstrain/nextclade_data/master/data_output/nextstrain/rsv/a/EPI_ISL_412866/unreleased',
    ],
    [
      'https://github.com/nextstrain/nextclade_data/tree/release/data_output/nextstrain/rsv/a/EPI_ISL_412866/unreleased',
      'https://raw.githubusercontent.com/nextstrain/nextclade_data/release/data_output/nextstrain/rsv/a/EPI_ISL_412866/unreleased',
    ],
  ])('%p', async (input: string, result: string) => {
    expect(await getDatasetServerUrl({ 'dataset-server': input })).toBe(result)
  })
})
