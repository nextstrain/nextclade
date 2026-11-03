import i18next from 'i18next'
import type { AuspiceDistanceMeasure, AuspiceJsonV2, AuspiceState, AuspiceTreeNode } from 'auspice'
import { applyFilter, changeDistanceMeasure, updateVisibleTipsAndBranchThicknesses } from 'auspice/src/actions/tree'
import { togglePanelDisplay } from 'auspice/src/actions/panelDisplay'
import { CHANGE_PANEL_LAYOUT } from 'auspice/src/actions/types'
import { strainSymbol } from 'auspice/src/util/globals'
import handleFilesDropped from 'auspice/src/actions/filesDropped/filesDropped'
import {
  colorTreeByPositions,
  findPlacedSequenceNode,
  hideSecondTree,
  showCladeOnTree,
  showSecondTree,
  showSequenceOnTree,
  type ShowOnTreeParams,
} from 'src/state/auspice/auspice.actions'
import { treeSummary } from 'src/components/Tree/svgCaption'
import { hidePanels } from 'src/state/reducer'
import { getTreeStore } from 'src/state/store'

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

describe('tree store', () => {
  beforeEach(() => {
    // Auspice reads dropped files with a `FileReader`, which Node does not have
    vi.stubGlobal('FileReader', BinaryStringFileReader)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  describe('branch length', () => {
    // Expected measures: time only when every node has a date (`findAvailableDistanceMeasures()` of the patched
    // Auspice), then divergence, then a mutation count for the genome and each CDS with a mutation on the tree, in
    // the order of the genome map
    // prettier-ignore
    test.each<[string, MakeTreeParams, AuspiceDistanceMeasure[]]>([
      ['every node dated',          { refDates: true, newDates: true },  ['num_date', 'div', 'mutationCount:nuc', 'mutationCount:S']],
      ['placed sequences undated',  { refDates: true, newDates: false }, ['div', 'mutationCount:nuc', 'mutationCount:S']],
      ['no node dated',             {},                                  ['div', 'mutationCount:nuc', 'mutationCount:S']],
      ['a CDS without mutations',   { cds: ['S', 'E'] },                 ['div', 'mutationCount:nuc', 'mutationCount:S']],
      ['no mutations at all',       { mutations: {} },                   ['div']],
      ['only invalid mutations',    { mutations: { nuc: ['N5T', 'A6-'], S: ['X2N'] } }, ['div']],
    ])('offers the branch lengths of a tree with %s', (_name, params, expected) => {
      const { controls } = getTreeStore(makeTree(params)).getState()

      expect(controls?.availableDistanceMeasures).toStrictEqual(expected)
    })

    test('shows a tree without dates by divergence, without an error, when the dataset names no branch length', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const { controls } = getTreeStore(makeTree()).getState()

      const errors = consoleError.mock.calls
      consoleError.mockRestore()
      expect([controls?.distanceMeasure, errors]).toStrictEqual(['div', []])
    })

    test.each(SECOND_TREE_CASES)(
      'shows both trees with an available branch length when the second tree has %s',
      (_name, { main, measure, second, measuresOfBoth }) => {
        const store = getTreeStore(makeTree(main))
        store.dispatch(changeDistanceMeasure(measure))

        store.dispatch(showSecondTree(makeTree(second), 'first', 'second'))

        const { controls } = store.getState()
        expect([controls?.distanceMeasure, controls?.availableDistanceMeasures]).toStrictEqual(['div', measuresOfBoth])
      },
    )

    test.each(SECOND_TREE_CASES)(
      'offers the branch lengths of the main tree again when the second tree with %s is removed',
      (_name, { main, measure, second, measuresOfMain }) => {
        const store = getTreeStore(makeTree(main))
        store.dispatch(changeDistanceMeasure(measure))
        store.dispatch(showSecondTree(makeTree(second), 'first', 'second'))

        store.dispatch(hideSecondTree())

        const { controls } = store.getState()
        expect(controls?.availableDistanceMeasures).toStrictEqual(measuresOfMain)
      },
    )
  })

  describe('figure summary', () => {
    test('tells the sampling dates of the shown tips of a dated tree', async () => {
      const state = getTreeStore(makeTree({ refDates: true, newDates: true })).getState()

      const summary = treeSummary(await summaryParams(state))

      // The tree is filtered to its 2 placed sequences of 27 tips, both dated 2020.0, which Auspice writes as "Jan 2020"
      expect(summary).toBe('Showing 2 of 27 genomes sampled between Jan 2020 and Jan 2020.')
    })

    test('tells only the number of shown tips of a tree whose placed sequences have no date', async () => {
      const state = getTreeStore(makeTree({ refDates: true, newDates: false })).getState()

      const summary = treeSummary(await summaryParams(state))

      expect(summary).toBe('Showing 2 of 27 genomes.')
    })
  })

  describe('show sequence on tree', () => {
    test('filters the tree to the sequence and zooms to its smallest clade of at least 20 tips', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showSequenceOnTree('seqA', ZOOM))

      const { controls, tree } = store.getState()
      expect(controls?.filters?.[strainSymbol]).toStrictEqual([{ value: 'seqA', active: true }])
      expect(tree?.nodes?.[tree.idxOfInViewRootNode ?? 0]?.name).toBe('cladeX')
    })

    test('zooms to the root when no clade of the sequence has 20 tips', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showSequenceOnTree('seqB', ZOOM))

      const { tree } = store.getState()
      expect(tree?.nodes?.[tree.idxOfInViewRootNode ?? 0]?.name).toBe('root')
    })

    test('turns off a filter that would hide the sequence, so that the user can turn it on again', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(applyFilter('add', 'clade_membership', ['Y']))

      store.dispatch(showSequenceOnTree('seqA', ZOOM))

      const { controls } = store.getState()
      expect(controls?.filters?.clade_membership).toStrictEqual([{ value: 'Y', active: false }])
    })

    test('keeps a filter that the sequence passes', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showSequenceOnTree('seqA', ZOOM))

      const { controls } = store.getState()
      expect(controls?.filters?.['Node type']).toStrictEqual([{ value: 'New', active: true }])
    })

    test('selects the sequence alone, replacing the selected sequences', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSequenceOnTree('seqA', NO_ZOOM))

      store.dispatch(showSequenceOnTree('seqB', NO_ZOOM))

      expect(store.getState().controls?.filters?.[strainSymbol]).toStrictEqual([{ value: 'seqB', active: true }])
    })

    test('adds the sequence to the selected sequences', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSequenceOnTree('seqA', NO_ZOOM))

      store.dispatch(showSequenceOnTree('seqB', { ...NO_ZOOM, addToSelection: true }))

      expect(store.getState().controls?.filters?.[strainSymbol]).toStrictEqual([
        { value: 'seqA', active: true },
        { value: 'seqB', active: true },
      ])
    })

    test('zooms to the smallest clade of at least 20 tips that contains every selected sequence', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSequenceOnTree('seqB', NO_ZOOM))

      store.dispatch(showSequenceOnTree('seqA', { addToSelection: true, zoom: true }))

      // `seqA` alone is shown in `cladeX`; with `seqB` of `cladeY`, their smallest common clade is the root
      expect(inViewRootName(store.getState())).toBe('root')
    })

    test('keeps the zoom when the sequence is in view', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(
        updateVisibleTipsAndBranchThicknesses({ root: [nodeIndex(store.getState(), 'cladeX'), undefined] }),
      )

      store.dispatch(showSequenceOnTree('seqA', NO_ZOOM))

      expect(inViewRootName(store.getState())).toBe('cladeX')
    })

    test('shows the whole tree when the zoom hides the sequence', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(
        updateVisibleTipsAndBranchThicknesses({ root: [nodeIndex(store.getState(), 'cladeX'), undefined] }),
      )

      store.dispatch(showSequenceOnTree('seqB', NO_ZOOM))

      // The zoom of a new store shows the whole tree
      expect(store.getState().tree?.idxOfInViewRootNode).toBe(
        getTreeStore(makeTree()).getState().tree?.idxOfInViewRootNode,
      )
    })

    test('shows the whole tree when the zoom hides a sequence selected before', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSequenceOnTree('seqB', NO_ZOOM))
      store.dispatch(
        updateVisibleTipsAndBranchThicknesses({ root: [nodeIndex(store.getState(), 'cladeX'), undefined] }),
      )

      store.dispatch(showSequenceOnTree('seqA', { addToSelection: true, zoom: false }))

      // The zoom of a new store shows the whole tree
      expect(store.getState().tree?.idxOfInViewRootNode).toBe(
        getTreeStore(makeTree()).getState().tree?.idxOfInViewRootNode,
      )
    })

    test('finds no tip of its own for a sequence named like a reference tip', () => {
      const store = getTreeStore(makeTree({ extraNewTips: ['refX1'] }))

      expect(findPlacedSequenceNode(store.getState(), 'refX1')).toBeUndefined()
    })
  })

  describe('show clade on tree', () => {
    test('filters the tree to the value alone, replacing the filtered values of the attribute', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showCladeOnTree('clade_membership', 'X', NO_ZOOM))

      store.dispatch(showCladeOnTree('clade_membership', 'Y', NO_ZOOM))

      expect(store.getState().controls?.filters?.clade_membership).toStrictEqual([{ value: 'Y', active: true }])
    })

    test('adds the value to the filtered values of the attribute', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showCladeOnTree('clade_membership', 'X', NO_ZOOM))

      store.dispatch(showCladeOnTree('clade_membership', 'Y', { ...NO_ZOOM, addToSelection: true }))

      expect(store.getState().controls?.filters?.clade_membership).toStrictEqual([
        { value: 'X', active: true },
        { value: 'Y', active: true },
      ])
    })

    test('turns off a selection of sequences that would hide placed sequences of the value', () => {
      const store = getTreeStore(makeTree({ extraNewTips: ['seqC'] }))
      store.dispatch(showSequenceOnTree('seqB', NO_ZOOM))

      store.dispatch(showCladeOnTree('clade_membership', 'Y', NO_ZOOM))

      // `seqC` of clade Y is not selected, so the selection would hide it
      expect(store.getState().controls?.filters?.[strainSymbol]).toStrictEqual([{ value: 'seqB', active: false }])
    })

    test('keeps a filter that every placed sequence of the value passes', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showCladeOnTree('clade_membership', 'X', NO_ZOOM))

      expect(store.getState().controls?.filters?.['Node type']).toStrictEqual([{ value: 'New', active: true }])
    })

    test('zooms to the smallest clade of at least 20 tips that contains the filtered tips', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showCladeOnTree('clade_membership', 'X', ZOOM))

      // The filters leave the placed sequence `seqA`, whose clade X has 23 tips
      expect(inViewRootName(store.getState())).toBe('cladeX')
    })

    test('keeps the zoom when the filtered tips are in view', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(
        updateVisibleTipsAndBranchThicknesses({ root: [nodeIndex(store.getState(), 'cladeX'), undefined] }),
      )

      store.dispatch(showCladeOnTree('clade_membership', 'X', NO_ZOOM))

      expect(inViewRootName(store.getState())).toBe('cladeX')
    })

    test('shows the whole tree when the zoom hides a filtered tip', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(
        updateVisibleTipsAndBranchThicknesses({ root: [nodeIndex(store.getState(), 'cladeX'), undefined] }),
      )

      store.dispatch(showCladeOnTree('clade_membership', 'Y', NO_ZOOM))

      // The zoom of a new store shows the whole tree
      expect(store.getState().tree?.idxOfInViewRootNode).toBe(
        getTreeStore(makeTree()).getState().tree?.idxOfInViewRootNode,
      )
    })

    test.each(['Z', 'unknown'])('changes nothing for the value %s, which no placed sequence has', (value) => {
      const store = getTreeStore(makeTree())

      store.dispatch(showCladeOnTree('clade_membership', value, ZOOM))

      // A new store has no clade filter and shows the whole tree
      const { controls, tree } = store.getState()
      expect([controls?.filters?.clade_membership, tree?.idxOfInViewRootNode]).toStrictEqual([
        undefined,
        getTreeStore(makeTree()).getState().tree?.idxOfInViewRootNode,
      ])
    })
  })

  describe('color tree by positions', () => {
    test('colors the tree by a nucleotide position, counted from 1', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(colorTreeByPositions('nuc', [4]))

      expect(store.getState().controls?.colorBy).toBe('gt-nuc_5')
    })

    test('colors the tree by amino acid positions of a CDS, counted from 1', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(colorTreeByPositions('S', [1, 2]))

      expect(store.getState().controls?.colorBy).toBe('gt-S_2,3')
    })

    test('keeps the coloring for a CDS that the tree does not have', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(colorTreeByPositions('ORF9', [1]))

      expect(store.getState().controls?.colorBy).toBe('clade_membership')
    })
  })

  describe('second tree', () => {
    test('draws a second tree with links between tips of the same name, keeping the view of the first tree', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(colorTreeByPositions('nuc', [4]))
      store.dispatch(applyFilter('add', 'clade_membership', ['X']))

      store.dispatch(showSecondTree(makeTree({ extraNewTips: ['seqC'] }), 'first', 'second'))

      const { controls, tree, treeToo } = store.getState()
      const linkedNames = (treeToo?.tangleTipLookup ?? []).map(([left]) => tree?.nodes?.[left]?.name).sort()
      expect({
        showTreeToo: controls?.showTreeToo,
        colorBy: controls?.colorBy,
        cladeFilter: controls?.filters?.clade_membership,
        linkedNames,
      }).toStrictEqual({
        showTreeToo: 'second',
        colorBy: 'gt-nuc_5',
        cladeFilter: [{ value: 'X', active: true }],
        linkedNames: ['seqA'],
      })
    })

    test('colors the second tree by genotype when both trees have the same genome annotation', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))

      store.dispatch(colorTreeByPositions('nuc', [4]))

      const { treeToo } = store.getState()
      const seqA = treeToo?.nodes?.findIndex((node) => node.name === 'seqA') ?? -1
      // Color of missing values: `unknownColor` in Auspice's `src/util/colorScale.ts`
      expect(treeToo?.nodeColors?.[seqA]).not.toBe('#ADB1B3')
    })

    test('returns to one tree', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))

      store.dispatch(hideSecondTree())

      expect(store.getState().controls?.showTreeToo).toBe(false)
    })

    test('shows a sequence on the first tree while a second tree is shown', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))

      store.dispatch(showSequenceOnTree('seqA', ZOOM))

      const { controls, tree } = store.getState()
      expect([controls?.filters?.[strainSymbol], tree?.nodes?.[tree.idxOfInViewRootNode ?? 0]?.name]).toStrictEqual([
        [{ value: 'seqA', active: true }],
        'cladeX',
      ])
    })
  })

  describe('panels', () => {
    test('shows the map when added metadata has coordinates', async () => {
      const store = getTreeStore(makeTree())

      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))

      expect(panels(store.getState())).toStrictEqual({
        available: ['tree', 'entropy', 'map'],
        shown: ['tree', 'entropy', 'map'],
      })
    })

    test('places the legend of a map that added metadata makes available', async () => {
      const store = getTreeStore(makeTree())

      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))

      // Auspice's placement of the map legend: `computeLegendPlacements()` in `src/util/metadataJsonParsing.ts`
      const expected = { vertical: 'top', horizontal: 'right' }
      expect(store.getState().metadata?.legendPlacements?.map).toStrictEqual(expected)
    })

    test('keeps a hidden entropy chart hidden when metadata is added', async () => {
      const store = getTreeStore(makeTree())
      store.dispatch(togglePanelDisplay('entropy'))

      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))

      expect(panels(store.getState()).shown).toStrictEqual(['tree', 'map'])
    })

    test('shows the panels chosen before the second tree when it is removed', async () => {
      const store = getTreeStore(makeTree())
      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))
      store.dispatch(togglePanelDisplay('entropy'))
      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))

      store.dispatch(hideSecondTree())

      expect(panels(store.getState()).shown).toStrictEqual(['tree', 'map'])
    })

    test('shows the map of coordinates added next to a second tree once the second tree is removed', async () => {
      const store = getTreeStore(makeTree())
      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))
      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))
      const shownNextToSecondTree = panels(store.getState()).shown

      store.dispatch(hideSecondTree())

      expect([shownNextToSecondTree, panels(store.getState()).shown]).toStrictEqual([
        ['tree'],
        ['tree', 'entropy', 'map'],
      ])
    })

    test('keeps a hidden map hidden after the second tree is removed', async () => {
      const store = getTreeStore(makeTree())
      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))
      store.dispatch(hidePanels(['map']))
      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))

      store.dispatch(hideSecondTree())

      expect(panels(store.getState()).shown).toStrictEqual(['tree', 'entropy'])
    })

    test('offers the grid layout for the tree and the map', async () => {
      const store = getTreeStore(makeTree())
      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))

      // Action of Auspice's "Display" control (`src/components/controls/panel-layout.js`)
      store.dispatch({ type: CHANGE_PANEL_LAYOUT, data: 'grid' })

      const { controls } = store.getState()
      expect([controls?.canTogglePanelLayout, controls?.panelLayout]).toStrictEqual([true, 'grid'])
    })

    test('offers no grid layout next to a second tree', async () => {
      const store = getTreeStore(makeTree())
      await store.dispatch(handleFilesDropped([csvFile(COORDINATES_CSV)]))
      store.dispatch({ type: CHANGE_PANEL_LAYOUT, data: 'grid' })

      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))

      const { controls } = store.getState()
      expect([controls?.canTogglePanelLayout, controls?.panelLayout]).toStrictEqual([false, 'full'])
    })
  })
})

/** "Show on tree" that selects the sequence alone and zooms to it */
const ZOOM: ShowOnTreeParams = { addToSelection: false, zoom: true }

/** "Show on tree" that selects the sequence alone and keeps the zoom */
const NO_ZOOM: ShowOnTreeParams = { addToSelection: false, zoom: false }

/** A tree shown by a branch length, then a second tree that lacks it */
// prettier-ignore
const SECOND_TREE_CASES: [string, SecondTreeCase][] = [
  ['undated placed sequences', {
    main: { refDates: true, newDates: true }, measure: 'num_date', second: { refDates: true, newDates: false },
    measuresOfBoth: ['div', 'mutationCount:nuc', 'mutationCount:S'],
    measuresOfMain: ['num_date', 'div', 'mutationCount:nuc', 'mutationCount:S'],
  }],
  ['another genome map', {
    main: {}, measure: 'mutationCount:S', second: { cds: ['HA1'], mutations: { nuc: ['C7G'], HA1: ['D4E'] } },
    measuresOfBoth: ['div', 'mutationCount:nuc'],
    measuresOfMain: ['div', 'mutationCount:nuc', 'mutationCount:S'],
  }],
]

interface SecondTreeCase {
  main: MakeTreeParams
  /** Branch length chosen on the main tree before the second tree is shown */
  measure: AuspiceDistanceMeasure
  second: MakeTreeParams
  measuresOfBoth: AuspiceDistanceMeasure[]
  measuresOfMain: AuspiceDistanceMeasure[]
}

/** Metadata that places the sequence `seqA` at coordinates */
const COORDINATES_CSV = 'strain,latitude,longitude\nseqA,47.5,7.6\n'

interface MakeTreeParams {
  /** Whether the reference nodes have dates */
  refDates?: boolean
  /** Whether the placed sequences and the nodes that attach them have dates */
  newDates?: boolean
  /** Names of further placed sequences, in clade Y */
  extraNewTips?: string[]
  /** CDSs of the genome map */
  cds?: string[]
  /** Mutations on the branch of each placed sequence */
  mutations?: Record<string, string[]>
  /** Branch length that the dataset shows first; Auspice's default is the time axis */
  distanceMeasure?: AuspiceDistanceMeasure
}

/**
 * Return a tree with clade X of 22 reference tips and the sequence `seqA`, and clade Y of 3 reference tips and the
 * sequence `seqB`. The sequences have a nucleotide mutation at position 5 and an amino acid mutation at position 2 of
 * the CDS `S`
 */
function makeTree({
  refDates = false,
  newDates = false,
  extraNewTips = [],
  cds = ['S'],
  mutations = { nuc: ['A5T'], S: ['K2N'] },
  distanceMeasure,
}: MakeTreeParams = {}): AuspiceJsonV2 {
  function tip(name: string, clade: string, nodeType: 'Reference' | 'New'): AuspiceTreeNode {
    const isNew = nodeType === 'New'
    const hasDate = isNew ? newDates : refDates
    return {
      name,
      node_attrs: {
        'div': isNew ? 2 : 1,
        'clade_membership': { value: clade },
        'Node type': { value: nodeType },
        'num_date': hasDate ? { value: 2020 } : undefined,
      },
      branch_attrs: isNew ? { mutations } : {},
    }
  }
  function clade(name: string, label: string, tips: AuspiceTreeNode[]): AuspiceTreeNode {
    return {
      name,
      node_attrs: {
        'div': 0.5,
        'clade_membership': { value: label },
        'Node type': { value: 'Reference' },
        'num_date': refDates ? { value: 2019 } : undefined,
      },
      branch_attrs: { labels: { clade: label } },
      children: tips,
    }
  }
  const refTips = (prefix: string, clade: string, n: number) =>
    Array.from({ length: n }, (_, i) => tip(`${prefix}${i + 1}`, clade, 'Reference'))

  return {
    version: 'v2',
    meta: {
      title: 'Test tree',
      updated: '2026-01-01',
      colorings: [
        { key: 'clade_membership', title: 'Clade', type: 'categorical' },
        { key: 'Node type', title: 'Node type', type: 'categorical' },
      ],
      display_defaults: {
        color_by: 'clade_membership',
        branch_label: 'clade',
        ...(distanceMeasure ? { distance_measure: distanceMeasure } : {}),
      },
      filters: ['clade_membership', 'Node type'],
      panels: ['tree', 'entropy'],
      genome_annotations: {
        nuc: { start: 1, end: 30, strand: '+', type: 'source' },
        ...Object.fromEntries(cds.map((name) => [name, { start: 1, end: 30, strand: '+', type: 'CDS' }])),
      },
    },
    tree: {
      name: 'root',
      node_attrs: {
        'div': 0,
        'clade_membership': { value: 'X' },
        'Node type': { value: 'Reference' },
        'num_date': refDates ? { value: 2018 } : undefined,
      },
      children: [
        clade('cladeX', 'X', [...refTips('refX', 'X', 22), tip('seqA', 'X', 'New')]),
        clade('cladeY', 'Y', [
          ...refTips('refY', 'Y', 3),
          tip('seqB', 'Y', 'New'),
          ...extraNewTips.map((name) => tip(name, 'Y', 'New')),
        ]),
      ],
    },
  }
}

/** Parameters of the figure summary of the tree of the given state, with a translation function that has no texts */
async function summaryParams(state: AuspiceState) {
  const i18n = i18next.createInstance()
  await i18n.init({ lng: 'en', resources: {} })
  return {
    nodes: state.tree?.nodes ?? [],
    visibility: state.tree?.visibility ?? [],
    mainTreeNumTips: state.metadata?.mainTreeNumTips ?? 0,
    availableDistanceMeasures: state.controls?.availableDistanceMeasures ?? [],
    t: i18n.t.bind(i18n),
  }
}

function nodeIndex(state: AuspiceState, name: string): number {
  return state.tree?.nodes?.findIndex((node) => node.name === name) ?? -1
}

function inViewRootName(state: AuspiceState): string | undefined {
  return state.tree?.nodes?.[state.tree.idxOfInViewRootNode ?? 0]?.name
}

function panels(state: AuspiceState) {
  return { available: state.controls?.panelsAvailable, shown: state.controls?.panelsToDisplay }
}

function csvFile(content: string): File {
  return new File([content], 'metadata.csv', { type: 'text/csv' })
}

/** `FileReader` that reads a file as a binary string, which is the only way Auspice reads dropped files */
class BinaryStringFileReader {
  result: string | undefined = undefined
  onload: (() => void) | undefined = undefined
  onerror: ((error: unknown) => void) | undefined = undefined

  readAsBinaryString(file: File) {
    file
      .arrayBuffer()
      .then((buffer) => {
        this.result = Array.from(new Uint8Array(buffer), (byte) => String.fromCharCode(byte)).join('')
        this.onload?.()
      })
      .catch((error: unknown) => this.onerror?.(error))
  }
}
