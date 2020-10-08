/* eslint-disable camelcase */
import { AuspiceTreeNode } from 'auspice'
import copy from 'fast-copy'
import { set } from 'lodash'

import type { AuspiceJsonV2 } from 'auspice'
import { NodeType } from 'src/algorithms/tree/enums'

import type { AuspiceJsonV2Extended, AuspiceTreeNodeExtended, MutationMap } from 'src/algorithms/tree/types'
import { parseMutationOrThrow } from 'src/algorithms/tree/parseMutationOrThrow'

export function setNodeTypes(node: AuspiceTreeNode) {
  set(node, `node_attrs['Node type']`, { value: NodeType.Reference })
  node.children?.forEach(setNodeTypes)
}

export function mutations_on_tree(node: AuspiceTreeNode, id: { value: number }, mutations: MutationMap) {
  const tmp_muts = copy(mutations)

  const nucleotideMutations = node?.branch_attrs?.mutations?.nuc
  if (nucleotideMutations) {
    for (const mut of nucleotideMutations) {
      const { anc, pos, der } = parseMutationOrThrow(mut)
      const previousNuc = mutations.get(pos)
      if (previousNuc && previousNuc !== anc) {
        throw new Error(
          `Mutation is inconsistent: "${mut}": current nucleotide: "${anc}", previously seen: "${previousNuc}"`,
        )
      }
      tmp_muts.set(pos, der)
    }
  }

  // Extend the node with out temporary parameters
  const nodeExtended = node as AuspiceTreeNodeExtended
  nodeExtended.mutations = tmp_muts
  nodeExtended.id = id.value

  const { children } = nodeExtended
  if (children) {
    for (const child of children) {
      id.value += 1
      mutations_on_tree(child, id, tmp_muts)
    }
  }

  return nodeExtended
}

export function treePreprocess(auspiceData: AuspiceJsonV2): AuspiceJsonV2Extended {
  const focal_node = auspiceData?.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  setNodeTypes(focal_node)

  // This will be the global index of nodes.
  // It's wrapped into an object to emulate pass-by-reference semantics for a primitive type (number).
  const id = { value: 0 }
  const mutations = new Map()
  const tree = mutations_on_tree(focal_node, id, mutations)

  return { ...auspiceData, tree }
}
