import { test, expect } from '@playwright/test'
import { URLParameterTester, TEST_DATASETS } from './helpers/url-parameters'

test.describe('Error Handling and CORS Tests', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should handle invalid dataset name', async () => {
    await tester.navigateWithParams({
      'dataset-name': 'invalid-dataset-name-xyz-123',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-name']).toBe('invalid-dataset-name-xyz-123')
  })

  test('should handle non-existent dataset tag', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'dataset-tag': '1999-01-01--00-00-00Z',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-tag']).toBe('1999-01-01--00-00-00Z')
  })

  test('should handle unreachable dataset server', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'https://does-not-exist-xyz-123.example.com',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('https://does-not-exist-xyz-123.example.com')
  })

  test('should handle invalid GitHub shortcut format', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:invalid-format',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('gh:invalid-format')
  })

  test('should handle non-existent GitHub repository', async () => {
    await tester.navigateWithParams({
      'dataset-server': 'gh:nonexistent/repository@master@/path/',
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['dataset-server']).toBe('gh:nonexistent/repository@master@/path/')
  })

  test('should handle invalid input file URL (404)', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'https://data.clades.nextstrain.org/nonexistent-file.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('https://data.clades.nextstrain.org/nonexistent-file.fasta')
  })

  test('should handle malformed URL', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'htp://invalid-protocol.com/file.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('htp://invalid-protocol.com/file.fasta')
  })

  test('should handle localhost URLs', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'http://localhost:8080/sequences.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('http://localhost:8080/sequences.fasta')
  })

  test('should handle file:// protocol', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'file:///path/to/sequences.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('file:///path/to/sequences.fasta')
  })

  test('should handle relative URLs', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': '../relative/path/sequences.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('../relative/path/sequences.fasta')
  })

  test('should handle data URLs', async () => {
    const dataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ='
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': dataUrl,
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe(dataUrl)
  })

  test('should handle URLs with authentication', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'https://user:password@example.com/sequences.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('https://user:password@example.com/sequences.fasta')
  })

  test('should handle URLs with port numbers', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'https://example.com:8443/sequences.fasta',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('https://example.com:8443/sequences.fasta')
  })

  test('should handle URLs with fragments', async () => {
    await tester.navigateWithParams({
      'dataset-name': TEST_DATASETS.SARS_COV_2.name,
      'input-fasta': 'https://example.com/sequences.fasta#fragment',
    })

    await tester.waitForAppLoaded()

    const urlParams = await tester.getURLParams()
    expect(urlParams['input-fasta']).toBe('https://example.com/sequences.fasta#fragment')
  })
})
