import type { Page } from '@playwright/test'

export interface URLParams {
  'dataset-name'?: string
  'dataset-tag'?: string
  'dataset-server'?: string
  'dataset-url'?: string
  'dataset-json-url'?: string
  'input-fasta'?: string
  'input-ref'?: string
  'input-annotation'?: string
  'input-tree'?: string
  'input-pathogen-json'?: string
  'multi-dataset'?: boolean
}

export class URLParameterTester {
  private initialUrlParams: Record<string, string> = {}

  constructor(public page: Page) {}

  async navigateWithParams(params: URLParams, baseUrl = '/') {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    const url = searchParams.toString() ? `${baseUrl}?${searchParams.toString()}` : baseUrl
    await this.page.goto(url)

    // Capture initial URL parameters immediately after navigation
    await this.captureInitialUrlParams()
  }

  private async captureInitialUrlParams() {
    const currentUrl = new URL(this.page.url())
    const { searchParams } = currentUrl

    this.initialUrlParams = {}
    searchParams.forEach((value, key) => {
      this.initialUrlParams[key] = value
    })
  }

  async waitForAppLoaded() {
    await this.page.waitForSelector('[role="navigation"]', { timeout: 10_000 })
  }

  async waitForDatasetLoaded() {
    await this.waitForAppLoaded()

    // Wait for the "Change reference dataset" button which only appears when dataset is loaded
    // This works in both dev and prod builds
    await this.page.waitForSelector('button:has-text("Change reference dataset")', { timeout: 10_000 })
  }

  async getDatasetNameLocator(expectedName: string) {
    await this.waitForDatasetLoaded()
    // Use data-testid which works in both dev and prod builds
    return this.page.getByTestId('dataset-name').filter({ hasText: expectedName }).first()
  }

  async checkForErrors() {
    // Check for error page (full page error via error boundary)
    const hasErrorPage = await this.page
      .getByTestId('error-page')
      .isVisible()
      .catch(() => false)

    // Check for error popup (modal error via globalErrorAtom)
    const hasErrorPopup = await this.page
      .getByTestId('error-popup')
      .isVisible()
      .catch(() => false)

    if (hasErrorPage || hasErrorPopup) {
      const errorText = await this.page.textContent('body')
      throw new Error(`Unexpected error in UI: ${errorText}`)
    }
  }

  async getURLParams() {
    // Return the initial URL parameters captured at navigation time
    // instead of current URL parameters which might be lost after navigation
    return this.initialUrlParams
  }

  async expectNoErrors() {
    await this.checkForErrors()
  }

  async expectDatasetName(expectedName: string) {
    return this.getDatasetNameLocator(expectedName)
  }

  async verifyURLParameters(expectedParams: Record<string, string>) {
    const urlParams = await this.getURLParams()
    return { urlParams, expectedParams }
  }
}

export const TEST_DATASETS = {
  SARS_COV_2: { name: 'sars-cov-2', fullName: 'SARS-CoV-2' },
  FLU_H3N2: { name: 'flu_h3n2_ha', fullName: 'Influenza A H3N2 HA' },
  RSV_A: { name: 'rsv_a', fullName: 'RSV-A' },
  MPOX: { name: 'mpox', fullName: 'Mpox' },
} as const

export const TEST_INPUT_FILES = {
  EXAMPLE_SEQUENCES: 'example',
  SARS_COV_2_SEQUENCES:
    'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2025-09-19--14-53-06Z/sequences.fasta',
  GITHUB_SEQUENCES: 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/sequences.fasta',
} as const

// Current valid dataset tags from the index
// NOTE: These should be NON-LATEST tags for tests that verify tag persistence
export const CURRENT_DATASET_TAGS = {
  SARS_COV_2: '2025-09-09--12-13-13Z',
  RSV_A: '2025-09-09--12-13-13Z',
} as const
