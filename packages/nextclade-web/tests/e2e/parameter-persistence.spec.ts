import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS, TEST_INPUT_FILES } from './helpers/url-parameters'

test.describe('URL Parameter Persistence Tests', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should preserve parameters when clicking internal links', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()

    const initialParams = await tester.getURLParams()
    expect(initialParams['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(initialParams['input-fasta']).toBe('example')
  })

  test('should preserve parameters when navigating to Dataset page', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()

    await tester.page.click('text=Dataset')
    await tester.waitForDatasetLoaded()

    const params = await tester.getURLParams()
    expect(params['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(params['input-fasta']).toBe('example')
  })

  test('should preserve parameters after page reload', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()

    await tester.page.reload()
    await tester.waitForDatasetLoaded()

    const params = await tester.getURLParams()
    expect(params['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(params['input-fasta']).toBe('example')
  })

  test('should preserve parameters when navigating back and forward', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()

    await tester.page.goto('/')
    await tester.waitForAppLoaded()

    await tester.page.goBack()
    await tester.waitForDatasetLoaded()

    const params = await tester.getURLParams()
    expect(params['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(params['input-fasta']).toBe('example')
  })

  test('should preserve multiple parameters together', async () => {
    const allParams = {
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '2025-09-19--14-53-06Z',
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
      'input-ref': 'https://example.com/reference.fasta',
      'input-annotation': 'https://example.com/annotation.gff3',
    }

    await tester.navigateWithParams(allParams)
    await tester.waitForDatasetLoaded()

    const params = await tester.getURLParams()
    expect(params['dataset-name']).toBe(allParams['dataset-name'])
    expect(params['dataset-tag']).toBe(allParams['dataset-tag'])
    expect(params['input-fasta']).toBe('example')
    expect(params['input-ref']).toBe(allParams['input-ref'])
    expect(params['input-annotation']).toBe(allParams['input-annotation'])
  })

  test('should handle parameter changes through navigation', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()

    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.RSV_A.name,
    })

    await tester.waitForDatasetLoaded()

    const params = await tester.getURLParams()
    expect(params['dataset-name']).toBe(TEST_DATASETS.RSV_A.name)
  })

  test('should preserve parameters when switching between datasets', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()

    const initialParams = await tester.getURLParams()
    expect(initialParams['input-fasta']).toBe('example')
  })

  test('should maintain parameter order', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
      'input-ref': 'https://example.com/reference.fasta',
    })

    await tester.waitForDatasetLoaded()

    const url = new URL(tester.page.url())
    const params = Array.from(url.searchParams.keys())
    expect(params).toContain('dataset-name')
    expect(params).toContain('input-fasta')
    expect(params).toContain('input-ref')
  })

  test('should handle parameter removal', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': TEST_INPUT_FILES.EXAMPLE_SEQUENCES,
    })

    await tester.waitForDatasetLoaded()

    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForDatasetLoaded()

    const params = await tester.getURLParams()
    expect(params['dataset-name']).toBe(TEST_DATASETS.SARS_COV_2.name)
    expect(params['input-fasta']).toBeUndefined()
  })

  test('should preserve GitHub shortcuts across navigation', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nextstrain/nextclade_data@master@/data_output/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/sequences.fasta',
    })

    await tester.waitForDatasetLoaded()

    const params = await tester.getURLParams()
    expect(params['dataset-server']).toContain('gh:')
    expect(params['input-fasta']).toContain('gh:')
  })
})
