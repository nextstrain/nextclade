/* eslint-disable camelcase */
import { cloneDeep } from 'lodash'

import type { AuspiceJsonV2 } from 'auspice'

import type { Nucleotide, NucleotideSubstitution, AnalysisResultWithoutClade } from 'src/algorithms/types'
import type { AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/types'
import { isSequenced } from 'src/algorithms/tree/isSequenced'
import { prepareTree } from 'src/algorithms/tree/prepareTree'

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

  const auspiceData = prepareTree()
  const focal_node = auspiceData?.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  const matchesAndDiffs = analysisResults.map((seq) => {
    const match = closest_match(focal_node, seq).best_node
    const diff = findMutDiff(match, seq)
    return { match, diff }
  })

  const matches = matchesAndDiffs.map((matchAndDiff) => matchAndDiff.match)
  const mutationsDiffs = matchesAndDiffs.map((matchAndDiff) => matchAndDiff.diff)

  return { matches, mutationsDiffs, auspiceData }
}
