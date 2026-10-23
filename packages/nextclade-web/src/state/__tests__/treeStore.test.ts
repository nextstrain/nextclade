import type { AuspiceJsonV2, AuspiceState, AuspiceTreeNode } from 'auspice'
import { applyFilter } from 'auspice/src/actions/tree'
import { strainSymbol } from 'auspice/src/util/globals'
import handleFilesDropped from 'auspice/src/actions/filesDropped/filesDropped'
import {
  colorTreeByPositions,
  findPlacedSequenceNode,
  hideSecondTree,
  showSecondTree,
  showSequenceOnTree,
} from 'src/state/auspice/auspice.actions'
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

  describe('time axis', () => {
    test('shows a tree by divergence only when a placed sequence has no date', () => {
      const { controls } = getTreeStore(makeTree({ refDates: true, newDates: false })).getState()

      expect([controls?.branchLengthsToDisplay, controls?.distanceMeasure]).toStrictEqual(['divOnly', 'div'])
    })

    test('offers the time axis when every node has a date', () => {
      const { controls } = getTreeStore(makeTree({ refDates: true, newDates: true })).getState()

      expect(controls?.branchLengthsToDisplay).toBe('divAndDate')
    })
  })

  describe('show sequence on tree', () => {
    test('filters the tree to the sequence and zooms to its smallest clade of at least 20 tips', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showSequenceOnTree('seqA'))

      const { controls, tree } = store.getState()
      expect(controls?.filters?.[strainSymbol]).toStrictEqual([{ value: 'seqA', active: true }])
      expect(tree?.nodes?.[tree.idxOfInViewRootNode ?? 0]?.name).toBe('cladeX')
    })

    test('zooms to the root when no clade of the sequence has 20 tips', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showSequenceOnTree('seqB'))

      const { tree } = store.getState()
      expect(tree?.nodes?.[tree.idxOfInViewRootNode ?? 0]?.name).toBe('root')
    })

    test('turns off a filter that would hide the sequence, so that the user can turn it on again', () => {
      const store = getTreeStore(makeTree())
      store.dispatch(applyFilter('add', 'clade_membership', ['Y']))

      store.dispatch(showSequenceOnTree('seqA'))

      const { controls } = store.getState()
      expect(controls?.filters?.clade_membership).toStrictEqual([{ value: 'Y', active: false }])
    })

    test('keeps a filter that the sequence passes', () => {
      const store = getTreeStore(makeTree())

      store.dispatch(showSequenceOnTree('seqA'))

      const { controls } = store.getState()
      expect(controls?.filters?.['Node type']).toStrictEqual([{ value: 'New', active: true }])
    })

    test('finds no tip of its own for a sequence named like a reference tip', () => {
      const store = getTreeStore(makeTree({ extraNewTips: ['refX1'] }))

      expect(findPlacedSequenceNode(store.getState(), 'refX1')).toBeUndefined()
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

      store.dispatch(showSequenceOnTree('seqA'))

      const { controls, tree } = store.getState()
      expect([controls?.filters?.[strainSymbol], tree?.nodes?.[tree.idxOfInViewRootNode ?? 0]?.name]).toStrictEqual([
        [{ value: 'seqA', active: true }],
        'cladeX',
      ])
    })
  })

  describe('panels', () => {
    test('makes the map available, but not shown, when added metadata has coordinates', async () => {
      const store = getTreeStore(makeTree())

      await store.dispatch(handleFilesDropped([csvFile('strain,latitude,longitude\nseqA,47.5,7.6\n')]))

      expect(panels(store.getState())).toStrictEqual({ available: ['tree', 'entropy', 'map'], shown: ['tree', 'entropy'] })
    })

    test('places the legend of a map that added metadata makes available', async () => {
      const store = getTreeStore(makeTree())

      await store.dispatch(handleFilesDropped([csvFile('strain,latitude,longitude\nseqA,47.5,7.6\n')]))

      // Auspice's placement of the map legend: `computeLegendPlacements()` in `src/util/metadataJsonParsing.ts`
      const expected = { vertical: 'top', horizontal: 'right' }
      expect(store.getState().metadata?.legendPlacements?.map).toStrictEqual(expected)
    })

    test('keeps a hidden entropy chart hidden when metadata is added', async () => {
      const store = getTreeStore(makeTree())
      store.dispatch({ type: 'TOGGLE_PANEL_DISPLAY', panelsToDisplay: ['tree'], panelLayout: 'full' })

      await store.dispatch(handleFilesDropped([csvFile('strain,site\nseqA,Basel\n')]))

      expect(panels(store.getState()).shown).toStrictEqual(['tree'])
    })

    test('does not show the map when the second tree is removed', async () => {
      const store = getTreeStore(makeTree())
      await store.dispatch(handleFilesDropped([csvFile('strain,latitude,longitude\nseqA,47.5,7.6\n')]))
      store.dispatch(showSecondTree(makeTree(), 'first', 'second'))

      store.dispatch(hideSecondTree())

      expect(panels(store.getState()).shown).not.toContain('map')
    })
  })
})

interface MakeTreeParams {
  /** Whether the reference nodes have dates */
  refDates?: boolean
  /** Whether the placed sequences and the nodes that attach them have dates */
  newDates?: boolean
  /** Names of further placed sequences, in clade Y */
  extraNewTips?: string[]
}

/**
 * Return a tree with clade X of 22 reference tips and the sequence `seqA`, and clade Y of 3 reference tips and the
 * sequence `seqB`. The sequences have a nucleotide mutation at position 5 and an amino acid mutation at position 2 of
 * the CDS `S`
 */
function makeTree({ refDates = false, newDates = false, extraNewTips = [] }: MakeTreeParams = {}): AuspiceJsonV2 {
  function tip(name: string, clade: string, nodeType: 'Reference' | 'New'): AuspiceTreeNode {
    const isNew = nodeType === 'New'
    const hasDate = isNew ? newDates : refDates
    return {
      name,
      node_attrs: {
        div: isNew ? 2 : 1,
        clade_membership: { value: clade },
        'Node type': { value: nodeType },
        num_date: hasDate ? { value: 2020 } : undefined,
      },
      branch_attrs: isNew ? { mutations: { nuc: ['A5T'], S: ['K2N'] } } : {},
    }
  }
  function clade(name: string, label: string, tips: AuspiceTreeNode[]): AuspiceTreeNode {
    return {
      name,
      node_attrs: {
        div: 0.5,
        clade_membership: { value: label },
        'Node type': { value: 'Reference' },
        num_date: refDates ? { value: 2019 } : undefined,
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
      display_defaults: { color_by: 'clade_membership', distance_measure: 'div', branch_label: 'clade' },
      filters: ['clade_membership', 'Node type'],
      panels: ['tree', 'entropy'],
      genome_annotations: {
        nuc: { start: 1, end: 30, strand: '+', type: 'source' },
        S: { start: 1, end: 30, strand: '+', type: 'CDS' },
      },
    },
    tree: {
      name: 'root',
      node_attrs: {
        div: 0,
        clade_membership: { value: 'X' },
        'Node type': { value: 'Reference' },
        num_date: refDates ? { value: 2018 } : undefined,
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
