/* eslint-disable camelcase */
import { AuspiceTreeNode } from 'auspice'
import copy from 'fast-copy'
import { set } from 'lodash'

import type { AuspiceJsonV2 } from 'auspice'
import { NodeType } from 'src/algorithms/tree/enums'

import type { AuspiceJsonV2Extended, AuspiceTreeNodeExtended, MutationMap } from 'src/algorithms/tree/types'
import { parseMutationOrThrow } from 'src/algorithms/tree/parseMutationOrThrow'
import { Nucleotide } from '../types'

export function setNodeTypes(node: AuspiceTreeNode) {
  set(node, `node_attrs['Node type']`, { value: NodeType.Reference })
  node.children?.forEach(setNodeTypes)
}

export function mutations_on_tree(
  node: AuspiceTreeNode,
  id: { value: number },
  mutations: MutationMap,
  rootSeq: string,
) {
  const tmp_muts = copy(mutations)

  const nucleotideMutations = node?.branch_attrs?.mutations?.nuc
  if (nucleotideMutations) {
    for (const mut of nucleotideMutations) {
      const { refNuc, pos, queryNuc } = parseMutationOrThrow(mut)
      const previousNuc = mutations.get(pos)
      if (previousNuc && previousNuc !== refNuc) {
        throw new Error(
          `Mutation is inconsistent: "${mut}": current nucleotide: "${refNuc}", previously seen: "${previousNuc}"`,
        )
      }

      // if the mutation reverts the nucleotide back to
      // what reference had, remove it from the map
      if (rootSeq[pos] === queryNuc) {
        tmp_muts.delete(pos)
      } else {
        tmp_muts.set(pos, queryNuc)
      }
    }
  }

  // Extend the node with out temporary parameters
  const nodeExtended = node as AuspiceTreeNodeExtended
  nodeExtended.mutations = tmp_muts
  const tmp_subs: MutationMap = new Map<number, Nucleotide>()
  tmp_muts?.forEach((v, k) => {
    if (v !== '-') {
      tmp_subs.set(k, v)
    }
  })
  nodeExtended.substitutions = tmp_subs
  nodeExtended.id = id.value

  const { children } = nodeExtended
  if (children) {
    for (const child of children) {
      id.value += 1
      mutations_on_tree(child, id, tmp_muts, rootSeq)
    }
  }

  return nodeExtended
}

export function treePreprocess(auspiceData: AuspiceJsonV2, rootSeq: string): AuspiceJsonV2Extended {
  const focal_node = auspiceData?.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  setNodeTypes(focal_node)

  // This will be the global index of nodes.
  // It's wrapped into an object to emulate pass-by-reference semantics for a primitive type (number).
  const id = { value: 0 }
  const mutations = new Map()
  const tree = mutations_on_tree(focal_node, id, mutations, rootSeq)

  return { ...auspiceData, tree }
}
