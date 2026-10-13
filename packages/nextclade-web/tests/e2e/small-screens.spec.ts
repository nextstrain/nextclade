import { test, expect, Locator, Page } from '@playwright/test'

const LAPTOP_SHORT = { width: 1280, height: 560 }
const TABLET_PORTRAIT = { width: 820, height: 1180 }
const PHONE = { width: 390, height: 844 }
const PHONE_NARROW = { width: 360, height: 740 }

/** Height of the navigation bar, which has room for one row of items */
const NAVBAR_HEIGHT_PX = 45

const BREADCRUMBS = ['Start', 'Dataset', 'Results', 'Tree', 'Export']

test.describe('Start page on small screens', () => {
  for (const { name, viewport, isMobile } of [
    { name: 'short laptop screen', viewport: LAPTOP_SHORT, isMobile: false },
    { name: 'phone', viewport: PHONE, isMobile: true },
  ]) {
    test.describe(name, () => {
      test.use({ viewport, isMobile, hasTouch: isMobile })

      test('shows added sequences and reaches the Run button by scrolling the page', async ({ page }) => {
        await page.goto('/?dataset-name=sars-cov-2')
        await page.getByRole('button', { name: 'Load example' }).click()

        await scrollPageBy(page, page.getByRole('heading', { name: 'Add more sequence data' }), 300)
        await expect(page.getByText("Examples for 'nextstrain/sars-cov-2/wuhan-hu-1/orfs'")).toBeInViewport({
          ratio: 1,
        })

        await scrollPageBy(page, page.getByRole('heading', { name: 'Add more sequence data' }), 3000)
        await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeInViewport({ ratio: 1 })
      })
    })
  }
})

test.describe('Dataset page on small screens', () => {
  for (const { name, viewport } of [
    { name: 'tablet', viewport: TABLET_PORTRAIT },
    { name: 'phone', viewport: PHONE },
  ]) {
    test.describe(name, () => {
      test.use({ viewport, isMobile: true, hasTouch: true })

      test('shows the selected dataset and its Run button below the dataset list', async ({ page }) => {
        await page.goto('/dataset?dataset-name=sars-cov-2')
        const selectedDatasetHeading = page.getByRole('heading', { name: 'Selected dataset', exact: true })
        await expect(selectedDatasetHeading).toBeAttached({ timeout: 30_000 })

        // The dataset list has limited height, so the selected dataset follows it on the first screen
        await expect(selectedDatasetHeading).toBeInViewport({ ratio: 1 })
        await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeInViewport({ ratio: 1 })
      })
    })
  }
})

test.describe('Navigation bar on a narrow phone', () => {
  test.use({ viewport: PHONE_NARROW, isMobile: true, hasTouch: true })

  test('shows all breadcrumbs and the language switcher in one row', async ({ page }) => {
    await page.goto('/')
    const navigation = page.getByRole('navigation').first()

    const placements = Object.fromEntries(
      await Promise.all(
        BREADCRUMBS.map(async (breadcrumb) => {
          const box = await navigation.getByText(breadcrumb, { exact: true }).boundingBox()
          return [breadcrumb, placementOf(box)] as const
        }),
      ),
    )

    // Every breadcrumb is in the single row of the navigation bar and fits the screen width
    const expected = Object.fromEntries(BREADCRUMBS.map((breadcrumb) => [breadcrumb, { inRow: true, fits: true }]))
    expect(placements).toEqual(expected)
    await expect(navigation.getByRole('link', { name: 'EN' })).toBeInViewport({ ratio: 1 })
  })
})

/** Scroll with the mouse wheel over the given element, as a user would to see more of the page */
async function scrollPageBy(page: Page, over: Locator, deltaY: number) {
  await over.hover()
  await page.mouse.wheel(0, deltaY)
}

function placementOf(box: { x: number; y: number; width: number; height: number } | null) {
  return {
    inRow: box !== null && box.y + box.height <= NAVBAR_HEIGHT_PX,
    fits: box !== null && box.x >= 0 && box.x + box.width <= PHONE_NARROW.width,
  }
}
