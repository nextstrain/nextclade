/* eslint-disable camelcase */
import { cloneDeep, set } from 'lodash'

import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

import type { AuspiceTreeNodeExtended, MutationMap } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/types'
import { parseMutationOrThrow } from 'src/algorithms/parseMutationOrThrow'

import auspiceDataRaw from 'src/assets/data/ncov_small.json'

export function setNodeTypes(node: AuspiceTreeNode) {
  set(node, `node_attrs['Node type']`, { value: NodeType.Reference })
  node.children?.forEach(setNodeTypes)
}

export function mutations_on_tree(node: AuspiceTreeNodeExtended, mutations: MutationMap) {
  const tmp_muts = cloneDeep(mutations)

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

  node.mutations = tmp_muts
  const { children } = node
  if (children) {
    for (const c of children) {
      mutations_on_tree(c, tmp_muts)
    }
  }
}

export function prepareTree() {
  const auspiceData = (cloneDeep(auspiceDataRaw) as unknown) as AuspiceJsonV2 // TODO: validate and sanitize
  const auspiceTreeVersionExpected = 'v2'
  const auspiceTreeVersion = (auspiceData?.version as string | undefined) ?? 'undefined'
  if (auspiceTreeVersion !== auspiceTreeVersionExpected) {
    throw new Error(
      `Tree format not recognized. Expected version "${auspiceTreeVersionExpected}", got "${auspiceTreeVersion}"`,
    )
  }

  const focal_node = auspiceData?.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  // TODO: this can be done offline when preparing the json
  setNodeTypes(focal_node)

  const mutations = new Map()
  mutations_on_tree(focal_node, mutations)

  return auspiceData
}

export const auspiceData = prepareTree()
