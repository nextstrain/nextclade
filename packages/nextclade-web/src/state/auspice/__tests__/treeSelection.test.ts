import type { AuspiceJsonV2, AuspiceState, AuspiceTreeNode } from 'auspice'
import { applyFilter, updateVisibleTipsAndBranchThicknesses } from 'auspice/src/actions/tree'
import { genotypeSymbol, NODE_VISIBLE, strainSymbol } from 'auspice/src/util/globals'
import { showSequenceOnTree } from 'src/state/auspice/auspice.actions'
import { getSelectedSequenceNames } from 'src/state/auspice/treeSelection'
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

const SELECT = { addToSelection: false, zoom: false }
const ADD = { addToSelection: true, zoom: false }

/** Filters that select some of the placed sequences of `makeTree()`, with the sequences they select */
const SELECTIONS: Selection[] = [
  {
    name: 'a click on "show on tree"',
    select: (store) => store.dispatch(showSequenceOnTree('seqA', SELECT)),
    expected: ['seqA'],
  },
  {
    name: 'a Shift+click that adds a sequence',
    select: (store) => {
      store.dispatch(showSequenceOnTree('seqA', SELECT))
      store.dispatch(showSequenceOnTree('seqB', ADD))
    },
    expected: ['seqA', 'seqB'],
  },
  {
    name: 'a filter by clade on the tree page',
    select: (store) => store.dispatch(applyFilter('add', 'clade_membership', ['X'])),
    expected: ['seqA', 'seqC'],
  },
  {
    name: 'filters by clade and by name together',
    select: (store) => {
      store.dispatch(applyFilter('add', 'clade_membership', ['X']))
      store.dispatch(applyFilter('add', strainSymbol, ['seqA', 'seqB']))
    },
    expected: ['seqA'],
  },
  {
    name: 'a filter by genotype',
    select: (store) => store.dispatch(applyFilter('add', genotypeSymbol, ['nuc 5T'])),
    expected: ['seqA', 'seqB'],
  },
]

describe('tree selection', () => {
  afterAll(() => {
    vi.unstubAllGlobals()
  })

  test('selects nothing while only the initial filter to the placed sequences is active', () => {
    const store = getTreeStore(makeTree())

    expect(selectedNames(store)).toStrictEqual([])
  })

  // Expected values from the tips of `makeTree()` that match the filters
  test.each(SELECTIONS)('selects the placed sequences of $name', ({ select, expected }) => {
    const store = getTreeStore(makeTree())

    select(store)

    expect(selectedNames(store)).toStrictEqual(expected)
  })

  test.each(SELECTIONS)('selects the placed sequences that the tree page shows for $name', ({ select }) => {
    const store = getTreeStore(makeTree())

    select(store)

    // Oracle: the placed tips that Auspice draws as visible while the whole tree is in view
    expect(selectedNames(store)).toStrictEqual(visiblePlacedTips(store.getState()))
  })

  test('keeps the selection when the tree zooms to a clade without the selected sequence', () => {
    const store = getTreeStore(makeTree())
    store.dispatch(showSequenceOnTree('seqA', SELECT))

    store.dispatch(updateVisibleTipsAndBranchThicknesses({ root: [nodeIndex(store.getState(), 'cladeY'), undefined] }))

    expect(selectedNames(store)).toStrictEqual(['seqA'])
  })

  test('selects nothing when the user turns the filter off in the header of the tree page', () => {
    const store = getTreeStore(makeTree())
    store.dispatch(showSequenceOnTree('seqA', SELECT))

    store.dispatch(applyFilter('inactivate', strainSymbol, ['seqA']))

    expect(selectedNames(store)).toStrictEqual([])
  })

  test('selects only placed sequences when the user removes the filter by node type', () => {
    const store = getTreeStore(makeTree())
    store.dispatch(applyFilter('remove', 'Node type', ['New']))

    store.dispatch(applyFilter('add', 'clade_membership', ['X']))

    // Expected: the placed tips of clade X in `makeTree()`, without its reference tips
    expect(selectedNames(store)).toStrictEqual(['seqA', 'seqC'])
  })

  test('selects nothing when no placed sequence matches every filter', () => {
    const store = getTreeStore(makeTree())

    store.dispatch(applyFilter('add', 'clade_membership', ['Y']))
    store.dispatch(applyFilter('add', strainSymbol, ['seqA']))

    expect(selectedNames(store)).toStrictEqual([])
  })

  test('selects nothing while the tree has no nodes', () => {
    expect(getSelectedSequenceNames({})).toStrictEqual(new Set())
  })
})

interface Selection {
  name: string
  select: (store: AuspiceStore) => void
  expected: string[]
}

function selectedNames(store: AuspiceStore): string[] {
  return [...getSelectedSequenceNames(store.getState())].toSorted()
}

function visiblePlacedTips({ tree }: AuspiceState): string[] {
  return (tree?.nodes ?? [])
    .filter((node) => !node.hasChildren && node.node_attrs?.['Node type']?.value === 'New')
    .filter((node) => tree?.visibility?.[node.arrayIdx] === NODE_VISIBLE)
    .map((node) => node.name)
    .toSorted()
}

function nodeIndex(state: AuspiceState, name: string): number {
  return state.tree?.nodes?.findIndex((node) => node.name === name) ?? -1
}

/**
 * Return a tree with clade X of 3 reference tips and the placed sequences `seqA` and `seqC`, and clade Y of 2 reference
 * tips and the placed sequence `seqB`. The tips `seqA`, `seqB` and `refY1` have the nucleotide mutation A5T
 */
function makeTree(): AuspiceJsonV2 {
  function tip(name: string, clade: string, nodeType: 'Reference' | 'New', mutations: string[] = []): AuspiceTreeNode {
    return {
      name,
      node_attrs: { 'div': 1, 'clade_membership': { value: clade }, 'Node type': { value: nodeType } },
      branch_attrs: { mutations: { nuc: mutations } },
    }
  }
  function clade(name: string, label: string, tips: AuspiceTreeNode[]): AuspiceTreeNode {
    return {
      name,
      node_attrs: { 'div': 0.5, 'clade_membership': { value: label }, 'Node type': { value: 'Reference' } },
      children: tips,
    }
  }
  return {
    version: 'v2',
    meta: {
      title: 'Test tree',
      updated: '2026-01-01',
      colorings: [
        { key: 'clade_membership', title: 'Clade', type: 'categorical' },
        { key: 'Node type', title: 'Node type', type: 'categorical' },
      ],
      display_defaults: { color_by: 'clade_membership', distance_measure: 'div' },
      filters: ['clade_membership', 'Node type'],
      panels: ['tree'],
      genome_annotations: { nuc: { start: 1, end: 30, strand: '+', type: 'source' } },
    },
    tree: {
      name: 'root',
      node_attrs: { 'div': 0, 'clade_membership': { value: 'X' }, 'Node type': { value: 'Reference' } },
      children: [
        clade('cladeX', 'X', [
          tip('refX1', 'X', 'Reference'),
          tip('refX2', 'X', 'Reference'),
          tip('refX3', 'X', 'Reference'),
          tip('seqA', 'X', 'New', ['A5T']),
          tip('seqC', 'X', 'New'),
        ]),
        clade('cladeY', 'Y', [
          tip('refY1', 'Y', 'Reference', ['A5T']),
          tip('refY2', 'Y', 'Reference'),
          tip('seqB', 'Y', 'New', ['A5T']),
        ]),
      ],
    },
  }
}
