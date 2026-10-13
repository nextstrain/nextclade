import { test, expect, Page } from '@playwright/test'
import { URLParameterTester } from './helpers/url-parameters'

const NO_TREE_HEADING = 'This dataset has no reference tree'

const PENDING_HEADINGS = /Preparing analysis|Analyzing sequences|Building tree/

test.describe('Tree page during and after analysis', () => {
  let tester: URLParameterTester

  test.beforeEach(async ({ page }) => {
    tester = new URLParameterTester(page)
  })

  test('should show the tree of a dataset with a reference tree, and never claim that there is no tree', async ({
    page,
  }) => {
    await tester.navigateWithParams({ 'dataset-name': 'rsv_a', 'input-fasta': 'example' })
    await page.waitForURL('**/results', { timeout: 30_000 })
    await watchNoTreeHeading(page)

    await openTreePage(page)
    // The analysis is still running right after it starts, unless the machine is very fast
    await expect(page.getByRole('heading', { name: PENDING_HEADINGS }).or(svgButton(page))).toBeVisible()

    await expect(svgButton(page)).toBeVisible({ timeout: 60_000 })
    expect(await hasNoTreeHeadingAppeared(page)).toBe(false)
  })

  test('should explain the missing tree of a dataset without a reference tree', async ({ page }) => {
    await tester.navigateWithParams({ 'dataset-name': 'nextstrain/flu/vic/pb1', 'input-fasta': 'example' })
    await page.waitForURL('**/results', { timeout: 30_000 })

    await openTreePage(page)

    await expect(page.getByRole('heading', { name: NO_TREE_HEADING })).toBeVisible({ timeout: 60_000 })
    // Dataset name from the dataset index (`attributes.name`)
    await expect(
      page.getByText('Dataset "Influenza B(Vic) PB1 (segment 1)" does not include a reference tree.'),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to results' })).toBeVisible()
    await expect(svgButton(page)).toHaveCount(0)
  })
})

/** Open the tree page with in-app navigation, which keeps the analysis state (a page load would clear it) */
async function openTreePage(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Tree', exact: true }).click()
  await page.waitForURL('**/tree')
}

function svgButton(page: Page) {
  return page.getByRole('button', { name: 'SVG' })
}

/** Record whether the "no reference tree" heading appears, including briefly, which polling would miss */
async function watchNoTreeHeading(page: Page) {
  await page.evaluate((heading) => {
    window.hasNoTreeHeadingAppeared = false
    new MutationObserver(() => {
      const isShown = Array.from(document.querySelectorAll('h4')).some((h) => h.textContent === heading)
      if (isShown) {
        window.hasNoTreeHeadingAppeared = true
      }
    }).observe(document.body, { childList: true, subtree: true })
  }, NO_TREE_HEADING)
}

async function hasNoTreeHeadingAppeared(page: Page): Promise<boolean | undefined> {
  return page.evaluate(() => window.hasNoTreeHeadingAppeared)
}

declare global {
  interface Window {
    hasNoTreeHeadingAppeared?: boolean
  }
}
