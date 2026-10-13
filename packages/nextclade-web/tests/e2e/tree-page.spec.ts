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

test.describe('Tree page sidebar controls', () => {
  test.describe.configure({ timeout: 300_000 })

  test('hides and shows the entropy chart from the sidebar', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)
    const entropyToggle = page.getByRole('checkbox', { name: 'Show Entropy panel' })
    const entropyChart = page.locator('#d3entropyParent')

    await expect(entropyToggle).toBeChecked()
    await expect(entropyChart).toBeAttached()

    await entropyToggle.click({ force: true })
    await expect(entropyToggle).not.toBeChecked()
    await expect(entropyChart).not.toBeAttached()

    await entropyToggle.click({ force: true })
    await expect(entropyToggle).toBeChecked()
    await expect(entropyChart).toBeAttached()

    expect(errors).toEqual([])
  })

  test('explodes the tree by clade', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)

    await choose(page, 'Explode Tree By', 'Clade')

    // The select shows the chosen value next to its input
    await expect(page.locator('div:has(> div > input[aria-label="Explode Tree By"])')).toHaveText('Clade')
    await expect(page.locator('#MainTree .tip').first()).toBeAttached()
    expect(errors).toEqual([])
  })

  test('recolors the tree when the coloring changes', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)
    const tipFills = () =>
      page.locator('#MainTree .tip').evaluateAll((tips) => tips.map((tip) => getComputedStyle(tip).fill).join())
    const fillsByClade = await tipFills()

    await choose(page, 'Color By', 'QC Status')

    await expect.poll(tipFills).not.toEqual(fillsByClade)
    expect(errors).toEqual([])
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

/** Run the SARS-CoV-2 example analysis and open the tree page. Return the uncaught page errors, which grow as they occur */
async function runExampleAndOpenTreePage(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/?dataset-name=sars-cov-2&input-fasta=example')
  await expect(page.getByText(/Done\. Total sequences/)).toBeVisible({ timeout: 180_000 })
  await openTreePage(page)
  await expect(page.getByRole('combobox', { name: 'Color By' })).toBeAttached({ timeout: 120_000 })

  return errors
}

/** Choose an option of a sidebar select. The select input has no size, so the menu is opened with the keyboard */
async function choose(page: Page, select: string, option: string) {
  await page.getByRole('combobox', { name: select }).focus()
  await page.keyboard.press('ArrowDown')
  await page.getByRole('option', { name: option, exact: true }).click()
}

declare global {
  interface Window {
    hasNoTreeHeadingAppeared?: boolean
  }
}
