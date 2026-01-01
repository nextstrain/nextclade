import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('GitHub Shortcuts URL Parameters', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should handle gh:owner/repo format', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toContain('gh:nextstrain/nextclade_data')
  })

  test('should handle gh:owner/repo@branch@ format', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('gh:nextstrain/nextclade_data@master@/data_output/')
  })

  test('should handle gh:owner/repo@branch@/path/to/file format', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/sequences.fasta',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toContain('gh:nextstrain/nextclade_data')
    expect(urlParams['input-fasta']).toContain('sequences.fasta')
  })

  test('should handle multiple GitHub shortcuts together', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/sequences.fasta',
      'input-ref': 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/reference.fasta',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toContain('gh:')
    expect(urlParams['input-fasta']).toContain('gh:')
    expect(urlParams['input-ref']).toContain('gh:')
  })

  test('should handle full GitHub URL format', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta':
        'https://github.com/nextstrain/nextclade_data/blob/master/nextstrain/sars-cov-2/wuhan-hu-1/orfs/sequences.fasta',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toContain('github.com')
  })

  test('should handle GitHub tree URL format', async () => {
    await tester.navigateWithParams({
      'dataset-url': 'https://github.com/nextstrain/nextclade_data/tree/master/nextstrain/sars-cov-2/wuhan-hu-1/orfs',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-url']).toContain('github.com')
    expect(urlParams['dataset-url']).toContain('/tree/')
  })

  test('should handle dataset-url with GitHub shortcut', async () => {
    await tester.navigateWithParams({
      'dataset-url': 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-url']).toContain('gh:nextstrain/nextclade_data')
  })
})
