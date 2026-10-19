import type { ParsedUrlQuery } from 'querystring'

// The GitHub API request for the default branch of a repository is the network boundary of these tests
const { axiosFetch } = vi.hoisted(() => ({ axiosFetch: vi.fn() }))
vi.mock('src/io/axiosFetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/io/axiosFetch')>()),
  axiosFetch,
}))

// Import after `vi.resetModules()`, so that the memoized default branch of a previous test does not leak
async function getDatasetServerUrl(urlQuery: ParsedUrlQuery) {
  const { getDatasetServerUrl } = await import('src/io/fetchDatasets')
  return getDatasetServerUrl(urlQuery)
}

describe('getDatasetServerUrl', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    vi.resetModules()
    axiosFetch.mockReset()
    process.env = { ...OLD_ENV, BRANCH_NAME: 'default-branch' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  describe('when the GitHub default branch request succeeds', () => {
    beforeEach(() => {
      axiosFetch.mockResolvedValue({ default_branch: 'main' }) // eslint-disable-line camelcase
    })

    it.each([
      ['gh:aaa/bbb', 'https://raw.githubusercontent.com/aaa/bbb/main/'],
      ['gh:aaa/bbb/', 'https://raw.githubusercontent.com/aaa/bbb/main/'],
      ['https://github.com/aaa/bbb', 'https://raw.githubusercontent.com/aaa/bbb/main/'],
      ['https://github.com/aaa/bbb/', 'https://raw.githubusercontent.com/aaa/bbb/main/'],
    ])('%p', async (input: string, result: string) => {
      expect(await getDatasetServerUrl({ 'dataset-server': input })).toBe(result)
      expect(axiosFetch).toHaveBeenCalledWith('https://api.github.com/repos/aaa/bbb')
    })
  })

  describe('when the GitHub default branch request fails', () => {
    beforeEach(() => {
      axiosFetch.mockRejectedValue(new Error('Request failed'))
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
})
