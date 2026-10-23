import { readFile } from 'node:fs/promises'
import { test, expect, Download, Page } from '@playwright/test'
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

    await expect(selectValue(page, 'Explode Tree By')).toHaveText('Clade')
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

test.describe('Tree page view of the tree', () => {
  test.describe.configure({ timeout: 300_000 })

  test('keeps the coloring and the zoom when the user returns to the tree page', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)
    const axisLabels = () => page.locator('#MainTree .gridText').allTextContents()
    const wholeTreeAxis = await axisLabels()

    await choose(page, 'Color By', 'QC Status')
    await page.getByRole('combobox', { name: 'Filter Data' }).fill('23I')
    await page.getByRole('option', { name: 'Clade \u2192 23I', exact: true }).click()
    await page.getByRole('button', { name: 'Zoom to Selected' }).click()
    await expect.poll(axisLabels).not.toEqual(wholeTreeAxis)
    const zoomedAxis = await axisLabels()

    await page.getByRole('navigation').getByRole('link', { name: 'Results', exact: true }).click()
    await page.waitForURL('**/results')
    await openTreePage(page)

    await expect(selectValue(page, 'Color By')).toHaveText('QC Status')
    await expect.poll(axisLabels).toEqual(zoomedAxis)
    expect(errors).toEqual([])
  })

  test('downloads the tree of the analysis in Newick format, the same file as on the export page', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)

    const download = await downloadFromButton(page, 'NWK')

    expect(download.suggestedFilename()).toBe('nextclade.nwk')
    expect((await readDownload(download)).trim()).toMatch(/^\(.*;$/s)
    expect(errors).toEqual([])
  })

  test('offers the downloads in one menu on narrow screens', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)
    await page.setViewportSize({ width: 390, height: 844 })

    await expect(svgButton(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    await expect(page.getByRole('menuitem')).toHaveText([
      /^Figure \(SVG\)/,
      /^Tree \(Auspice JSON\)/,
      /^Tree \(Newick\)/,
    ])
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: /^Tree \(Auspice JSON\)/ }).click()

    expect((await downloadPromise).suggestedFilename()).toBe('nextclade.auspice.json')
    expect(errors).toEqual([])
  })

  test('writes the dataset and the publications below the figure, instead of the Nextstrain terms', async ({
    page,
  }) => {
    const errors = await runExampleAndOpenTreePage(page)

    const download = await downloadFromButton(page, 'SVG')

    expect(download.suggestedFilename()).toBe('nextclade.svg')
    const caption = svgText(await readDownload(download))
    expect(caption).toContain('Nextclade dataset nextstrain/sars-cov-2/wuhan-hu-1/orfs')
    expect(caption).toContain('Made with Nextclade Web')
    expect(caption).toContain('Nextclade: clade assignment, mutation calling and quality control for viral genomes')
    expect(caption).not.toContain('Visualizations are licensed under CC-BY')
    expect(errors).toEqual([])
  })

  test('colors the tree by the columns of an added metadata file', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)
    const [firstName, secondName] = await tipNames(page)

    await addMetadataFile(page, {
      name: 'sites.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`strain,sampling_site\n${firstName},Basel\n${secondName},Zurich\n`),
    })

    await expect(page.getByRole('status').filter({ hasText: 'Adding metadata from sites.csv' })).toBeVisible()
    await choose(page, 'Color By', 'sampling_site')
    await expect(selectValue(page, 'Color By')).toHaveText('sampling_site')
    expect(errors).toEqual([])
  })

  test('refuses Excel files and tells how to add the data', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)

    await addMetadataFile(page, {
      name: 'sites.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('not a spreadsheet'),
    })

    const alert = page.getByRole('alert').filter({ hasText: "Excel files are not supported: 'sites.xlsx'" })
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('Save the sheet as a CSV or TSV file')
    expect(errors).toEqual([])
  })
})

test.describe('Tree page links', () => {
  test.describe.configure({ timeout: 300_000 })

  test('shows a sequence on the tree from the results table', async ({ page }) => {
    const errors = await runExampleAndOpenTreePage(page)
    await page.getByRole('navigation').getByRole('link', { name: 'Results', exact: true }).click()
    await page.waitForURL('**/results')
    const showButton = page.getByRole('button', { name: /^Show .+ on the tree$/ }).first()
    const seqName = (await showButton.getAttribute('aria-label'))?.replace(/^Show (.+) on the tree$/, '$1')

    await showButton.click()

    await page.waitForURL('**/tree')
    await expect(page.getByRole('button', { name: `Remove filter ${seqName}` })).toBeVisible()
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
  await expect(page.locator('#MainTree .tip').first()).toBeAttached()

  return errors
}

/** Choose an option of a sidebar select. The select input has no size, so the menu is opened with the keyboard */
async function choose(page: Page, select: string, option: string) {
  await page.getByRole('combobox', { name: select }).focus()
  await page.keyboard.press('ArrowDown')
  await page.getByRole('option', { name: option, exact: true }).click()
}

/** Value shown by a sidebar select, next to its input */
function selectValue(page: Page, select: string) {
  return page.locator(`div:has(> div > input[aria-label="${select}"])`)
}

/** Download the file of a download button above the tree */
async function downloadFromButton(page: Page, name: string): Promise<Download> {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name, exact: true }).click()
  return downloadPromise
}

async function readDownload(download: Download): Promise<string> {
  return readFile(await download.path(), 'utf8')
}

/** Text of an SVG file, one space between its text elements. A line of text that wraps is split into several elements */
function svgText(svg: string): string {
  return Array.from(svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g), ([, text]) => text).join(' ')
}

/** Names of two analyzed sequences, from the tree of the analysis */
async function tipNames(page: Page): Promise<string[]> {
  const download = await downloadFromButton(page, 'JSON')
  const tree = JSON.parse(await readDownload(download)) as { tree: TreeNode }
  return newTipNames(tree.tree).slice(0, 2)
}

interface TreeNode {
  name: string
  node_attrs?: { 'Node type'?: { value?: string } }
  children?: TreeNode[]
}

function newTipNames(node: TreeNode): string[] {
  if (!node.children?.length) {
    return node.node_attrs?.['Node type']?.value === 'New' ? [node.name] : []
  }
  return node.children.flatMap(newTipNames)
}

async function addMetadataFile(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add metadata' }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(file)
}

declare global {
  interface Window {
    hasNoTreeHeadingAppeared?: boolean
  }
}
