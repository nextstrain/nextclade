import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('Multi-Dataset Mode URL Parameters', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should handle multi-dataset parameter', async () => {
    await tester.navigateWithParams({
      'multi-dataset': true,
    })

    await tester.waitForAppLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['multi-dataset']).toBe('true')
  })

  test('should handle multi-dataset with input-fasta', async () => {
    await tester.navigateWithParams({
      'multi-dataset': true,
      'input-fasta': 'example',
    })

    await tester.waitForAppLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['multi-dataset']).toBe('true')
    expect(urlParams['input-fasta']).toBe('example')
  })

  test('should handle multi-dataset with external sequences', async () => {
    await tester.navigateWithParams({
      'multi-dataset': true,
      'input-fasta': 'https://example.com/sequences.fasta',
    })

    await tester.waitForAppLoaded()
    await tester.expectNoErrors()

    const urlParams = await tester.getURLParams()
    expect(urlParams['multi-dataset']).toBe('true')
    expect(urlParams['input-fasta']).toBe('https://example.com/sequences.fasta')
  })

  test('should preserve multi-dataset parameter after navigation', async () => {
    await tester.navigateWithParams({
      'multi-dataset': true,
      'input-fasta': 'example',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['multi-dataset']).toBe('true')
  })
})
