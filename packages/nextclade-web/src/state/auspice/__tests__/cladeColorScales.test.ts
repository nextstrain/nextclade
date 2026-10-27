import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'
import { changeColorBy } from 'auspice/src/actions/colors'
import { updateMetadata } from 'auspice/src/actions/updateMetadata/updateMetadata'
import { getCladeColor } from 'src/components/Results/cladeColor'
import { CLADE_NODE_ATTR } from 'src/constants'
import { getCladeColorScales } from 'src/state/auspice/cladeColorScales'
import { showSecondTree } from 'src/state/auspice/auspice.actions'
import { type AuspiceStore, getTreeStore } from 'src/state/store'

// Auspice sizes its panels from the browser window, also when its reducers load
vi.hoisted(() => {
  vi.stubGlobal('window', {
    innerWidth: 1280,
    innerHeight: 800,
    document: { body: { clientHeight: 800 } },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  })
})

const LINEAGE = 'lineage'

/** Placed sequences, with the values that the analysis results show for them in the table */
const NEW_TIPS: NewTip[] = [
  { name: 'seqA', clade: 'A', lineage: 'A.1' },
  { name: 'seqB', clade: 'B', lineage: 'B.1' },
  { name: 'seqC', clade: 'C', lineage: 'C.2' },
  { name: 'seqD', clade: 'unassigned', lineage: 'unknown' },
]

describe('clade color scales', () => {
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  test.each([CLADE_NODE_ATTR, LINEAGE])('colors each value of %s as the tree colors the tips of the value', (attr) => {
    const store = getTreeStore(makeTree())

    // Oracle: the colors of the tips that the tree page draws when the user colors the tree by the attribute
    expect(tableColors(store, attr)).toStrictEqual(treeColors(store, attr))
  })

  test('uses the color that the dataset sets for a value', () => {
    const scales = getCladeColorScales(getTreeStore(makeTree()).getState(), [CLADE_NODE_ATTR])

    // Oracle: the scale of the coloring in the tree JSON of `makeTree()`
    expect(getCladeColor(scales, CLADE_NODE_ATTR, 'A')?.stroke).toBe('#ff0000')
  })

  test('follows the colors that the user edits on the tree page', () => {
    const store = getTreeStore(makeTree())

    store.dispatch(
      updateMetadata(
        {
          edited: true,
          attributes: {
            [CLADE_NODE_ATTR]: {
              key: CLADE_NODE_ATTR,
              name: 'Clade',
              scaleType: 'categorical',
              strains: {},
              colors: [
                ['A', '#00ff00'],
                ['B', '#0000ff'],
                ['C', '#123456'],
              ],
            },
          },
        },
        true,
        false,
      ),
    )

    // Oracle: the colors set in the editor above; Auspice draws a value it does not consider valid, such as
    // "unassigned", in its color of unknown values `#ADB1B3` (`unknownColor` in auspice/src/util/colorScale.ts)
    expect(tableColors(store, CLADE_NODE_ATTR)).toStrictEqual({
      seqA: '#00ff00',
      seqB: '#0000ff',
      seqC: '#123456',
      seqD: '#ADB1B3',
    })
  })

  test('includes the values of a second tree, as the tree page does', () => {
    const store = getTreeStore(makeTree())
    const colorsOfOneTree = tableColors(store, LINEAGE)

    store.dispatch(showSecondTree(makeTree({ lineageOfRefTips: 'D.1' }), 'first', 'second'))

    // A lineage that only the second tree has adds a value to the coloring, which changes the colors of all lineages
    expect(tableColors(store, LINEAGE)).not.toStrictEqual(colorsOfOneTree)
    // Oracle: the colors of the tips that the tree page draws when the user colors the tree by lineage
    expect(tableColors(store, LINEAGE)).toStrictEqual(treeColors(store, LINEAGE))
  })

  test('gives no color to an attribute that the tree does not offer as a coloring', () => {
    const scales = getCladeColorScales(getTreeStore(makeTree()).getState(), [CLADE_NODE_ATTR, 'clade_who'])

    expect(getCladeColor(scales, 'clade_who', 'Omicron')).toBeUndefined()
  })

  test.each([
    { value: 'A', isKnown: true },
    { value: 'unassigned', isKnown: false },
  ])('marks whether the tree can filter by the value $value', ({ value, isKnown }) => {
    const scales = getCladeColorScales(getTreeStore(makeTree()).getState(), [CLADE_NODE_ATTR])

    // Oracle: Auspice treats "unassigned" as a missing value (`isValueValid` in auspice/src/util/globals.js)
    expect(getCladeColor(scales, CLADE_NODE_ATTR, value)?.isKnown).toBe(isKnown)
  })

  test.each([[''], [undefined]])('gives no color to the empty value %j', (value) => {
    const scales = getCladeColorScales(getTreeStore(makeTree()).getState(), [CLADE_NODE_ATTR])

    expect(getCladeColor(scales, CLADE_NODE_ATTR, value)).toBeUndefined()
  })
})

/** Return the color that the table shows for each placed sequence, in the column of the attribute */
function tableColors(store: AuspiceStore, attr: string): Record<string, string | undefined> {
  const scales = getCladeColorScales(store.getState(), [CLADE_NODE_ATTR, LINEAGE])
  return Object.fromEntries(NEW_TIPS.map((tip) => [tip.name, getCladeColor(scales, attr, valueOf(tip, attr))?.stroke]))
}

/** Return the color of the tip of each placed sequence, when the user colors the tree by the attribute */
function treeColors(store: AuspiceStore, attr: string): Record<string, string | undefined> {
  store.dispatch(changeColorBy(attr))
  const { tree } = store.getState()
  return Object.fromEntries(
    NEW_TIPS.map(({ name }) => {
      const node = tree?.nodes?.find((node) => node.name === name)
      return [name, node && tree?.nodeColors?.[node.arrayIdx]]
    }),
  )
}

function valueOf(tip: NewTip, attr: string): string {
  return attr === LINEAGE ? tip.lineage : tip.clade
}

interface NewTip {
  name: string
  clade: string
  lineage: string
}

interface MakeTreeParams {
  /** Lineage of all reference tips, instead of the lineages of their clades */
  lineageOfRefTips?: string
}

function makeTree({ lineageOfRefTips }: MakeTreeParams = {}): AuspiceJsonV2 {
  function tip(name: string, clade: string, lineage: string, nodeType: 'Reference' | 'New'): AuspiceTreeNode {
    return {
      name,
      node_attrs: {
        'div': nodeType === 'New' ? 2 : 1,
        'clade_membership': { value: clade },
        [LINEAGE]: { value: lineageOfRefTips && nodeType === 'Reference' ? lineageOfRefTips : lineage },
        'Node type': { value: nodeType },
      },
      branch_attrs: {},
    }
  }
  function clade(name: string, label: string, tips: AuspiceTreeNode[]): AuspiceTreeNode {
    return {
      name,
      node_attrs: { 'div': 0.5, 'clade_membership': { value: label }, 'Node type': { value: 'Reference' } },
      branch_attrs: { labels: { clade: label } },
      children: tips,
    }
  }

  return {
    version: 'v2',
    meta: {
      title: 'Test tree',
      updated: '2026-01-01',
      colorings: [
        // The dataset sets a color for clade A only, so the tree draws the other clades in shades of grey. The tree
        // draws "unassigned" as a missing value, although the dataset sets a color for it
        {
          key: 'clade_membership',
          title: 'Clade',
          type: 'categorical',
          scale: [
            ['A', '#ff0000'],
            ['unassigned', '#00ffff'],
          ],
        },
        // Without colors from the dataset, the tree orders the lineages by how often they occur
        { key: LINEAGE, title: 'Lineage', type: 'categorical' },
        { key: 'Node type', title: 'Node type', type: 'categorical' },
      ],
      display_defaults: { color_by: 'clade_membership', distance_measure: 'div', branch_label: 'clade' },
      filters: ['clade_membership', 'Node type'],
      panels: ['tree'],
    },
    tree: {
      name: 'root',
      node_attrs: { 'div': 0, 'clade_membership': { value: 'A' }, 'Node type': { value: 'Reference' } },
      branch_attrs: {},
      children: [
        clade('cladeA', 'A', [
          tip('refA1', 'A', 'A.1', 'Reference'),
          tip('refA2', 'A', 'A.2', 'Reference'),
          tip('seqA', 'A', 'A.1', 'New'),
        ]),
        clade('cladeB', 'B', [
          tip('refB1', 'B', 'B.1', 'Reference'),
          tip('refB2', 'B', 'B.1', 'Reference'),
          tip('seqB', 'B', 'B.1', 'New'),
        ]),
        clade('cladeC', 'C', [tip('refC1', 'C', 'C.2', 'Reference'), tip('seqC', 'C', 'C.2', 'New')]),
        tip('seqD', 'unassigned', 'unknown', 'New'),
      ],
    },
  }
}
