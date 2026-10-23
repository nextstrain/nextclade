import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'
import { isPlacedSequenceAlone } from 'src/components/Tree/treeNodeNames'

describe('isPlacedSequenceAlone', () => {
  test.each([
    { case: 'a placed sequence with a unique name', names: ['ref1', 'seqA'], seqName: 'seqA', expected: true },
    { case: 'a name that two placed sequences share', names: ['ref1', 'dup', 'dup'], seqName: 'dup', expected: false },
    { case: 'a placed sequence named like a reference tip', names: ['seqA', 'seqA'], seqName: 'seqA', expected: false },
    { case: 'a name that is not in the tree', names: ['ref1', 'seqA'], seqName: 'seqB', expected: false },
    { case: 'the name of a reference tip', names: ['ref1', 'seqA'], seqName: 'ref1', expected: false },
  ])('is $expected for $case', ({ names, seqName, expected }) => {
    // The first name is a reference tip and the others are placed sequences, as in a tree of an analysis
    const tree = makeTree(names)

    expect(isPlacedSequenceAlone(tree, seqName)).toBe(expected)
  })
})

function makeTree([refName, ...newNames]: string[]): AuspiceJsonV2 {
  function tip(name: string, nodeType: string): AuspiceTreeNode {
    return { name, node_attrs: { 'Node type': { value: nodeType } } }
  }
  return {
    version: 'v2',
    tree: {
      name: 'root',
      children: [tip(refName ?? 'ref', 'Reference'), { name: 'clade', children: newNames.map((name) => tip(name, 'New')) }],
    },
  }
}
