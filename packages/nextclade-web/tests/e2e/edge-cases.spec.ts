import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('URL Parameter Edge Cases', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should handle URL encoding of special characters', async () => {
    const urlWithSpaces = 'https://example.com/path with spaces/file.fasta'
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': urlWithSpaces,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(urlWithSpaces)
  })

  test('should handle URL with query parameters', async () => {
    const urlWithParams = 'https://example.com/file.fasta?param=value&other=test'
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': urlWithParams,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(urlWithParams)
  })

  test('should handle URL with special characters (parentheses)', async () => {
    const urlWithParens = 'https://example.com/file (1).fasta'
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': urlWithParens,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(urlWithParens)
  })

  test('should handle empty parameter values', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': '',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(urlParams['input-fasta']).toBe('')
  })

  test('should handle very long URLs', async () => {
    const longPath = `${'/very/long/path/'.repeat(20)}file.fasta`
    const longUrl = `https://example.com${longPath}`

    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': longUrl,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(longUrl)
  })

  test('should handle non-ASCII characters in URLs', async () => {
    // eslint-disable-next-line only-ascii/only-ascii
    const urlWithNonAscii = 'https://example.com/файл.fasta'
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': urlWithNonAscii,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(urlWithNonAscii)
  })

  test('should handle multiple slashes in URLs', async () => {
    const urlWithSlashes = 'https://example.com//path///file.fasta'
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': urlWithSlashes,
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(urlWithSlashes)
  })

  test('should handle dataset name with underscores', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'flu_h3n2_ha',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe('flu_h3n2_ha')
  })

  test('should handle dataset name with hyphens', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'sars-cov-2',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe('sars-cov-2')
  })

  test('should handle dataset name with slashes (full path)', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'nextstrain/sars-cov-2/wuhan-hu-1/orfs',
    })

    await tester.waitForDatasetLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe('nextstrain/sars-cov-2/wuhan-hu-1/orfs')
  })

  test('should handle case sensitivity in parameter names', async () => {
    await tester.page.goto('/?dataset-name=sars-cov-2&Dataset-Name=rsv_a')
    await tester.waitForAppLoaded()

    const currentUrl = new URL(tester.page.url())
    expect(currentUrl.searchParams.has('dataset-name')).toBe(true)
  })

  test('should handle duplicate parameters', async () => {
    await tester.page.goto('/?dataset-name=sars-cov-2&dataset-name=rsv_a')
    await tester.waitForAppLoaded()

    const currentUrl = new URL(tester.page.url())
    const allValues = currentUrl.searchParams.getAll('dataset-name')
    expect(allValues.length).toBeGreaterThan(0)
  })

  test('should handle parameter with no value', async () => {
    await tester.page.goto('/?dataset-name=sars-cov-2&input-fasta')
    await tester.waitForAppLoaded()

    const currentUrl = new URL(tester.page.url())
    expect(currentUrl.searchParams.has('dataset-name')).toBe(true)
  })
})
