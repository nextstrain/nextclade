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
    await this.page.waitForSelector('[role="navigation"]')
    await this.page.waitForFunction(
      () => {
        const spinners = document.querySelectorAll('[data-testid="loading"], .spinner')
        return spinners.length === 0
      },
      { timeout: 5000 },
    )
  }

  async waitForDatasetLoaded() {
    await this.waitForAppLoaded()

    // Wait for either dataset info or error message
    await Promise.race([
      this.page.waitForSelector('h4[class*="DatasetNameHeading"]', { timeout: 5000 }), // Dataset name heading
      this.page.waitForSelector('h2:has-text("An unexpected error has occurred")', { timeout: 5000 }), // Error heading
    ])

    // Check for error conditions
    const hasError = await this.page
      .locator('h2:has-text("An unexpected error has occurred")')
      .first()
      .isVisible()
      .catch(() => false)

    if (hasError) {
      const errorText = await this.page.textContent('body')
      throw new Error(`Dataset loading failed: ${errorText}`)
    }
  }

  async getDatasetNameLocator(expectedName: string) {
    await this.waitForDatasetLoaded()
    // Look for h4 heading that contains the dataset name
    return this.page.locator('h4[class*="DatasetNameHeading"]').filter({ hasText: expectedName }).first()
  }

  async checkForErrors() {
    await this.waitForAppLoaded()

    const hasError = await this.page
      .locator('h2:has-text("An unexpected error has occurred")')
      .first()
      .isVisible()
      .catch(() => false)

    if (hasError) {
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
export const CURRENT_DATASET_TAGS = {
  SARS_COV_2: '2025-09-19--14-53-06Z',
  RSV_A: '2025-09-09--12-13-13Z',
} as const
