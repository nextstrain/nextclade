/* eslint-disable camelcase */
import { set } from 'lodash'

import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

import type { Nucleotide, NucleotideSubstitution, AnalysisResultWithoutClade } from 'src/algorithms/types'
import type { AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/enums'

export function isSequenced(pos: number, seq: AnalysisResultWithoutClade) {
  return pos >= seq.alignmentStart && pos < seq.alignmentEnd && seq.missing.every((d) => pos < d.begin || pos >= d.end)
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
export function findPrivateMutations(node: AuspiceTreeNodeExtended, seq: AnalysisResultWithoutClade, root_seq: string) {
  const privateMutations: NucleotideSubstitution[] = []
  const mutatedPositions = new Set(seq.substitutions.map((s) => s.pos))

  // This is effectively a set difference operation
  seq.substitutions.forEach((qmut) => {
    if (!(node.mutations?.has(qmut.pos) && node.mutations?.get(qmut.pos) === qmut.queryNuc)) {
      privateMutations.push(qmut)
    }
  })

  for (const [pos, refNuc] of node?.mutations ?? []) {
    if (!mutatedPositions.has(pos) && isSequenced(pos, seq)) {
      const queryNuc = root_seq[pos] as Nucleotide
      privateMutations.push({ pos, refNuc, queryNuc })
    }
  }

  return privateMutations
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

export function setNodeTypes(node: AuspiceTreeNode) {
  set(node, `node_attrs['Node type']`, { value: NodeType.Reference })
  node.children?.forEach(setNodeTypes)
}

export interface LocateInTreeParams {
  analysisResults: AnalysisResultWithoutClade[]
  rootSeq: string
  auspiceData: AuspiceJsonV2
}

export interface LocateInTreeResults {
  matches: AuspiceTreeNodeExtended[]
  privateMutationSets: NucleotideSubstitution[][]
  auspiceData: AuspiceJsonV2
}

export function treeFindNearestNodes({
  analysisResults,
  rootSeq,
  auspiceData,
}: LocateInTreeParams): LocateInTreeResults {
  const focal_node = auspiceData?.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  const matchesAndDiffs = analysisResults.map((seq) => {
    const match = closest_match(focal_node, seq).best_node
    const diff = findPrivateMutations(match, seq, rootSeq)
    return { match, diff }
  })

  const matches = matchesAndDiffs.map((matchAndDiff) => matchAndDiff.match)
  const privateMutationSets = matchesAndDiffs.map((matchAndDiff) => matchAndDiff.diff)

  return { matches, privateMutationSets, auspiceData }
}
