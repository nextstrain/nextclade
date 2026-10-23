import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

/** Number of nodes of each name, of each tree */
const nodeNameCounts = new WeakMap<AuspiceJsonV2, Map<string, number>>()

/**
 * Return whether the tree has exactly one node of the name of the sequence, and that node is a placed sequence. Auspice
 * renames a node whose name it has already seen, so a name that occurs more than once has no tip of its own
 */
export function isPlacedSequenceAlone(tree: AuspiceJsonV2, seqName: string): boolean {
  if (countNodesNamed(tree, seqName) !== 1) {
    return false
  }
  return findNode(tree.tree, seqName)?.node_attrs?.['Node type']?.value === 'New'
}

function countNodesNamed(tree: AuspiceJsonV2, name: string): number {
  let counts = nodeNameCounts.get(tree)
  if (!counts) {
    counts = new Map()
    for (const node of allNodes(tree.tree)) {
      counts.set(node.name, (counts.get(node.name) ?? 0) + 1)
    }
    nodeNameCounts.set(tree, counts)
  }
  return counts.get(name) ?? 0
}

function findNode(root: AuspiceTreeNode | undefined, name: string): AuspiceTreeNode | undefined {
  for (const node of allNodes(root)) {
    if (node.name === name) {
      return node
    }
  }
  return undefined
}

/** Iterate over the nodes of a tree without recursion, because reference trees can be deep */
function* allNodes(root: AuspiceTreeNode | undefined): Generator<AuspiceTreeNode> {
  const stack = root ? [root] : []
  for (let node = stack.pop(); node; node = stack.pop()) {
    yield node
    stack.push(...(node.children ?? []))
  }
}
