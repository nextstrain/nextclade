import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'
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
