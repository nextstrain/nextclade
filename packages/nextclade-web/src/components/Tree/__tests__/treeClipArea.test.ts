import { type ClipMaskTree, setClipMask } from 'auspice/src/components/tree/phyloTree/renderers'

/** x range of the tree in the SVG, from the left to the right end, and the width of branch labels in the root margin */
const X_MIN = 54
const X_MAX = 1540
const BRANCH_LABELS = 49

/** The clip area extends 5px past the left end of the x range and 15px past the right end, in Auspice's layout */
const LEFT_PAD = 5
const RIGHT_PAD = 15

describe('tree clip area', () => {
  test.each([
    { case: 'a tree without branch labels in the margin', mirrored: false, branchLabels: 0 },
    { case: 'a tree with branch labels in the left margin', mirrored: false, branchLabels: BRANCH_LABELS },
    { case: 'a mirrored tree without branch labels in the margin', mirrored: true, branchLabels: 0 },
    { case: 'a mirrored tree with branch labels in the right margin', mirrored: true, branchLabels: BRANCH_LABELS },
  ])('shows the tips at both ends of the x range in $case', ({ mirrored, branchLabels }) => {
    const { left, right } = clipArea(mirrored, branchLabels)

    expect(left).toBeLessThanOrEqual(X_MIN - LEFT_PAD)
    expect(right).toBeGreaterThanOrEqual(X_MAX + RIGHT_PAD)
  })

  test.each([
    { case: 'a tree', mirrored: false, rootSide: 'left' as const, expected: X_MIN - LEFT_PAD - BRANCH_LABELS },
    { case: 'a mirrored tree', mirrored: true, rootSide: 'right' as const, expected: X_MAX + RIGHT_PAD + BRANCH_LABELS },
  ])('covers the branch labels on the root side of $case', ({ mirrored, rootSide, expected }) => {
    const area = clipArea(mirrored, BRANCH_LABELS)

    expect(area[rootSide]).toBe(expected)
  })
})

/** Run `setClipMask()` on a tree with the x range [X_MIN, X_MAX] and return the x extent of the clip rectangle */
function clipArea(mirrored: boolean, branchLabels: number) {
  const attrs = new Map<string, number>()
  const rect = {
    attr(name: string, value: number) {
      attrs.set(name, value)
      return rect
    },
  }
  const tree: ClipMaskTree = {
    xScale: { range: () => (mirrored ? [X_MAX, X_MIN] : [X_MIN, X_MAX]) },
    yScale: { range: () => [15, 800] },
    margins: { branchLabels },
    params: { orientation: [mirrored ? -1 : 1, 1] },
    groups: { clipPath: { select: () => rect } },
  }
  setClipMask.call(tree)
  const left = attrs.get('x') ?? Number.NaN
  return { left, right: left + (attrs.get('width') ?? Number.NaN) }
}
