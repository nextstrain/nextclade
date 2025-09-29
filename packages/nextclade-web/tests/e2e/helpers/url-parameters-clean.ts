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
  }

  async waitForAppLoaded() {
    await this.page.waitForSelector('[role="navigation"]')
    await this.page.waitForFunction(
      () => {
        const spinners = document.querySelectorAll('[data-testid="loading"], .spinner')
        return spinners.length === 0
      },
      { timeout: 30_000 },
    )
  }

  async waitForDatasetLoaded() {
    await this.waitForAppLoaded()
    await this.page.waitForSelector('text=Dataset', { timeout: 30_000 })

    const errorElement = this.page.locator('text=Error').first()
    const isErrorVisible = await errorElement.isVisible().catch(() => false)

    if (isErrorVisible) {
      const errorText = await this.page.textContent('body')
      throw new Error(`Dataset loading failed: ${errorText}`)
    }
  }

  async getDatasetNameLocator(expectedName: string) {
    await this.waitForDatasetLoaded()
    return this.page.getByText(expectedName, { exact: false })
  }

  async checkForErrors() {
    await this.waitForAppLoaded()

    const errorMessages = await this.page.locator('[role="alert"], .alert-danger, text=Error').all()

    if (errorMessages.length > 0) {
      const errorTexts = await Promise.all(
        errorMessages.map(async (errorMsg) => {
          const isVisible = await errorMsg.isVisible().catch(() => false)
          if (isVisible) {
            return errorMsg.textContent()
          }
          return null
        }),
      )

      const visibleErrors = errorTexts.filter(Boolean)
      if (visibleErrors.length > 0) {
        throw new Error(`Unexpected error in UI: ${visibleErrors.join(', ')}`)
      }
    }
  }

  async getURLParams() {
    const currentUrl = new URL(this.page.url())
    const { searchParams } = currentUrl

    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })

    return params
  }
}

export const TEST_DATASETS = {
  SARS_COV_2: { name: 'sars-cov-2', fullName: 'SARS-CoV-2' },
  FLU_H3N2: { name: 'flu_h3n2_ha', fullName: 'Influenza A/H3N2 HA' },
  RSV_A: { name: 'rsv_a', fullName: 'RSV-A' },
} as const

export const TEST_INPUT_FILES = {
  EXAMPLE_SEQUENCES: 'example',
  SARS_COV_2_SEQUENCES:
    'https://data.clades.nextstrain.org/v3/nextstrain/sars-cov-2/wuhan-hu-1/orfs/2024-07-17--12-47-30Z/sequences.fasta',
  GITHUB_SEQUENCES: 'gh:nextstrain/nextclade_data@master@/nextstrain/sars-cov-2/wuhan-hu-1/orfs/sequences.fasta',
} as const
