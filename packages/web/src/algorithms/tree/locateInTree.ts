/* eslint-disable camelcase */
import { cloneDeep, set } from 'lodash'

import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

import type { Nucleotide, NucleotideSubstitution, AnalysisResultWithoutClade } from 'src/algorithms/types'
import type { AuspiceTreeNodeExtended, MutationMap } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/types'
import { parseMutationOrThrow } from 'src/algorithms/tree/parseMutationOrThrow'
import { isSequenced } from 'src/algorithms/tree/isSequenced'

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

export function calculate_distance(node: AuspiceTreeNodeExtended, seq: AnalysisResultWithoutClade) {
  let shared_differences = 0
  let shared_sites = 0
  for (const qmut of seq.substitutions) {
    const der = node.mutations?.get(qmut.pos)
    if (der) {
      // position is also mutated in node
      if (qmut.queryNuc === der) {
        shared_differences += 1 // the exact mutation is shared between node and seq
      } else {
        shared_sites += 1 // the same position is mutated, but the states are different
      }
    }
  }
  // determine the number of sites that are mutated in the node but missing in seq.
  // for these we can't tell whether the node agrees with seq
  let undetermined_sites = 0
  if (node.mutations) {
    for (const nmut of node.mutations) {
      const pos = nmut[0]
      if (!isSequenced(pos, seq)) {
        undetermined_sites += 1
      }
    }
  }

  const numMut = node.mutations?.size ?? 0
  // calculate distance from set overlaps.
  return numMut + seq.substitutions.length - 2 * shared_differences - shared_sites - undetermined_sites
}

/* Find mutations that are present in the new sequence, but not present in the matching reference node sequence */
export function findMutDiff(node: AuspiceTreeNodeExtended, seq: AnalysisResultWithoutClade) {
  const nodeMuts: [number, Nucleotide][] = Array.from(node.mutations?.entries() ?? [])

  // This is effectively a set difference operation
  return seq.substitutions.filter((qmut) =>
    nodeMuts.every(([pos, queryNuc]) => !(pos === qmut.pos && queryNuc === qmut.queryNuc)),
  )
}

export function closest_match(node: AuspiceTreeNodeExtended, seq: AnalysisResultWithoutClade) {
  let best = calculate_distance(node, seq)
  let best_node = node
  const children = node.children ?? []

  // Only consider nodes of the reference tree, skip newly added nodes
  const refChildren = children.filter((node) => node.node_attrs?.['Node type'].value !== NodeType.New)

  for (const child of refChildren) {
    const { best: tmp_best, best_node: tmp_best_node } = closest_match(child, seq)
    if (tmp_best < best) {
      best = tmp_best
      best_node = tmp_best_node
    }
  }

  return { best, best_node }
}

export interface LocateInTreeParams {
  analysisResults: AnalysisResultWithoutClade[]
  rootSeq: string
}

export interface LocateInTreeResults {
  matches: AuspiceTreeNodeExtended[]
  mutationsDiffs: NucleotideSubstitution[][]
  auspiceData: AuspiceJsonV2
}

export function locateInTree({
  analysisResults: analysisResultsRaw,
  rootSeq,
}: LocateInTreeParams): LocateInTreeResults {
  const analysisResults = cloneDeep(analysisResultsRaw)
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

  const matchesAndDiffs = analysisResults.map((seq) => {
    const match = closest_match(focal_node, seq).best_node
    const diff = findMutDiff(match, seq)
    return { match, diff }
  })

  const matches = matchesAndDiffs.map((matchAndDiff) => matchAndDiff.match)
  const mutationsDiffs = matchesAndDiffs.map((matchAndDiff) => matchAndDiff.diff)

  return { matches, mutationsDiffs, auspiceData }
}
