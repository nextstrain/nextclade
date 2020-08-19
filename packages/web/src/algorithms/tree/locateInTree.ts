/* eslint-disable camelcase */
import { cloneDeep, groupBy, identity, mapValues, set, unset, zip } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'
import type { AuspiceJsonV2, AuspiceTreeNode, AuspiceState } from 'auspice'
import { createStateFromQueryOrJSONs } from 'auspice/src/actions/recomputeReduxState'

import { UNKNOWN_VALUE } from 'src/constants'
import type {
  Nucleotide,
  NucleotideSubstitution,
  AnalysisResultWithoutClade,
  AnalysisResult,
} from 'src/algorithms/types'
import type { AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { NodeType, QCStatusType } from 'src/algorithms/tree/types'
import { parseMutationOrThrow } from 'src/algorithms/parseMutationOrThrow'
import { auspiceData } from 'src/algorithms/prepareTree'

import { notUndefined } from 'src/helpers/notUndefined'
import { formatAAMutationWithoutGene, formatMutation } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { formatQCDivergence } from 'src/helpers/formatQCDivergence'
import { formatQCMissingData } from 'src/helpers/formatQCMissingData'
import { formatQCSNPClusters } from 'src/helpers/formatQCSNPClusters'
import { formatQCMixedSites } from 'src/helpers/formatQCMixedSites'

export function get_node_struct(seq: AnalysisResult): AuspiceTreeNodeExtended {
  const {
    alignmentStart,
    alignmentEnd,
    alignmentScore,
    totalGaps,
    deletions,
    nonACGTNs,
    totalNonACGTNs,
    missing,
    totalMissing,
    qc,
  } = seq

  const qcStatus = (qc?.score ?? Infinity) > 0 ? QCStatusType.Fail : QCStatusType.Pass
  let qcFlags = 'Not available'
  if (qc) {
    const { divergence, snpClusters, mixedSites, missingData } = qc
    const t = identity
    const messages = [
      formatQCDivergence(t, divergence),
      formatQCSNPClusters(t, snpClusters),
      formatQCMixedSites(t, mixedSites),
      formatQCMissingData(t, missingData),
    ].filter(notUndefined)

    qcFlags = messages.join('; ')
  }

  const alignment = `start: ${alignmentStart}, end: ${alignmentEnd} (score: ${alignmentScore})`

  const listOfMissing = missing.map(({ begin, end }) => formatRange(begin, end)).join(', ')
  const formattedMissing = totalMissing > 0 ? `(${totalMissing}): ${listOfMissing}` : 'None'

  const listOfNonACGTNs = nonACGTNs.map(({ begin, end, nuc }) => `${nuc}: ${formatRange(begin, end)}`).join(', ')
  const formattedNonACGTNs = totalNonACGTNs > 0 ? `(${totalNonACGTNs}): ${listOfNonACGTNs}` : 'None'

  const listOfGaps = deletions.map(({ start, length }) => formatRange(start, start + length)).join(', ')
  const formattedGaps = totalGaps > 0 ? `(${totalGaps}): ${listOfGaps}` : 'None'

  return {
    branch_attrs: { mutations: {} },
    name: `${seq.seqName}_clades`,
    node_attrs: {
      'clade_membership': { value: seq.clade },
      'Node type': { value: NodeType.New },
      'Alignment': { value: alignment },
      'Missing:': { value: formattedMissing },
      'Gaps': { value: formattedGaps },
      'Non-ACGTNs': { value: formattedNonACGTNs },
      'QC Status': { value: qcStatus },
      'QC Flags': { value: qcFlags },
    },
    mutations: new Map(),
  }
}

export function isSequenced(pos: number, seq: DeepReadonly<AnalysisResultWithoutClade>) {
  return pos >= seq.alignmentStart && pos < seq.alignmentEnd && seq.missing.every((d) => pos < d.begin || pos >= d.end)
}

export function calculate_distance(
  node: DeepReadonly<AuspiceTreeNodeExtended>,
  seq: DeepReadonly<AnalysisResultWithoutClade>,
) {
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
export function findMutDiff(
  node: DeepReadonly<AuspiceTreeNodeExtended>,
  seq: DeepReadonly<AnalysisResultWithoutClade>,
) {
  const nodeMuts: [number, Nucleotide][] = Array.from(node.mutations?.entries() ?? [])

  // This is effectively a set difference operation
  return seq.substitutions.filter((qmut) =>
    nodeMuts.every(([pos, queryNuc]) => !(pos === qmut.pos && queryNuc === qmut.queryNuc)),
  )
}

export function get_differences(node: AuspiceTreeNodeExtended, seq: AnalysisResultWithoutClade, root_seq: string) {
  const nucMutations: string[] = []
  let aminoacidMutationEntries: { gene: string; aaMut: string }[] = []
  const positionsCovered = new Set()

  for (const qmut of seq.substitutions) {
    const { pos, queryNuc } = qmut
    const der = node.mutations?.get(pos)
    positionsCovered.add(pos)

    let refNuc
    if (der) {
      if (queryNuc !== der) {
        // shared site but states of node and seq differ
        refNuc = der
      }
    } else {
      // node does not have a mutation, but seq does -> compare to root
      refNuc = root_seq[pos] as Nucleotide
    }

    if (refNuc) {
      const mut = formatMutation({ refNuc, pos, queryNuc })
      nucMutations.push(mut)

      // TODO: these are amino acid mutations relative to reference. Double hits won't how up properly
      const aminoacidMutationEntriesNew = qmut.aaSubstitutions.map(({ codon, gene, queryAA, refAA }) => {
        const aaMut = formatAAMutationWithoutGene({ refAA, codon, queryAA })
        return { gene, aaMut }
      })

      aminoacidMutationEntries = [...aminoacidMutationEntries, ...aminoacidMutationEntriesNew]
    }
  }

  const aminoacidMutationsGrouped = groupBy(aminoacidMutationEntries, ({ gene }) => gene)
  const aminoacidMutationsFinal = mapValues(aminoacidMutationsGrouped, (aaMuts) => aaMuts.map(({ aaMut }) => aaMut))
  const mutations = {
    nuc: nucMutations,
    ...aminoacidMutationsFinal,
  }

  for (const mut of node.mutations ?? []) {
    const pos = mut[0]
    // mutation in node that is not present in node
    if (!positionsCovered.has(pos) && isSequenced(pos, seq)) {
      const refNuc = root_seq[pos] as Nucleotide
      const mutStr = formatMutation({ refNuc: mut[1], pos, queryNuc: refNuc })
      nucMutations.push(mutStr)
    }
  }

  const totalNucMutations = nucMutations.length
  return { mutations, nucMutations, totalNucMutations }
}

export function closest_match(node: AuspiceTreeNodeExtended, seq: DeepReadonly<AnalysisResultWithoutClade>) {
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

export function addAuxiliaryNode(baseNode: AuspiceTreeNodeExtended) {
  let newTerminal = cloneDeep(baseNode)
  newTerminal = {
    ...newTerminal,
    branch_attrs: {
      ...newTerminal.branch_attrs,
      mutations: { nuc: [] },
    },
  }

  baseNode.name = `${newTerminal.name}_parent`
  baseNode.children = [newTerminal]
  unset(baseNode, 'node_attrs.author')
  unset(baseNode, 'node_attrs.url')
}

export function isLeaf(node: AuspiceTreeNodeExtended) {
  return !node.children || node.children.length === 0
}

export function attach_to_tree(base_node: AuspiceTreeNodeExtended, seq: AnalysisResult, rootSeq: string) {
  if (isLeaf(base_node)) {
    addAuxiliaryNode(base_node)
  }

  const { mutations, nucMutations, totalNucMutations } = get_differences(base_node, seq, rootSeq)
  const baseDiv = base_node.node_attrs?.div ?? 0
  const div = baseDiv + totalNucMutations

  const new_node = get_node_struct(seq)
  set(new_node, 'branch_attrs.mutations', mutations)
  set(new_node, 'node_attrs.div', div)
  set(new_node, 'node_attrs.region', { value: UNKNOWN_VALUE })
  set(new_node, 'node_attrs.country', { value: UNKNOWN_VALUE })
  set(new_node, 'node_attrs.division', { value: UNKNOWN_VALUE })
  set(new_node, 'mutations', cloneDeep(base_node.mutations))

  for (const mut of nucMutations) {
    const { pos, der } = parseMutationOrThrow(mut)
    new_node.mutations?.set(pos, der)
  }

  const children = base_node?.children ?? []
  base_node.children = [new_node, ...children]
}

export function remove_mutations(node: AuspiceTreeNodeExtended) {
  if (node?.mutations) {
    node.mutations = undefined
  }

  const children = node?.children ?? []
  for (const c of children) {
    remove_mutations(c)
  }
}

export interface AddColoringScaleParams {
  auspiceData: AuspiceJsonV2
  key: string
  value: string
  color: string
}

export function addColoringScale({ auspiceData, key, value, color }: AddColoringScaleParams) {
  const coloring = auspiceData?.meta?.colorings.find((coloring) => coloring.key === key)
  coloring?.scale?.unshift([UNKNOWN_VALUE, color])
}

export interface LocateInTreeParams {
  readonly analysisResults: DeepReadonly<AnalysisResultWithoutClade[]>
}

export interface LocateInTreeResults {
  matches: AuspiceTreeNodeExtended[]
  mutationsDiffs: NucleotideSubstitution[][]
}

export function locateInTree({ analysisResults }: LocateInTreeParams): LocateInTreeResults {
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

  return { matches, mutationsDiffs }
}

export interface FinalizeTreeParams {
  results: AnalysisResult[]
  matches: AuspiceTreeNode[]
  rootSeq: string
}

export interface FinalizeTreeResults {
  auspiceData: AuspiceJsonV2
  auspiceState: AuspiceState
}

export function finalizeTree({ results, matches, rootSeq }: FinalizeTreeParams): FinalizeTreeResults {
  const analysisResults = cloneDeep(results)
  zip(analysisResults, matches).forEach(([seq, match]) => {
    if (!seq || !match) {
      throw new Error(
        `Expected number of analysis results and number of match to be the same, but got:
            data.length: ${analysisResults.length}
            matches.length: ${matches.length}`,
      )
    }

    attach_to_tree(match, seq, rootSeq)
  })

  const focal_node = auspiceData?.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  remove_mutations(focal_node)

  if (!auspiceData?.meta) {
    auspiceData.meta = { colorings: [], display_defaults: {} }
  }

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.colorings.unshift({
    key: 'QC Status',
    title: 'QC Status',
    type: 'categorical',
    scale: [
      [QCStatusType.Pass, '#417C52'],
      [QCStatusType.Fail, '#CA738E'],
    ],
  })

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.colorings.unshift({
    key: 'Node type',
    title: 'Node type',
    type: 'categorical',
    scale: [
      [NodeType.New, '#ff6961'],
      [NodeType.Reference, '#999999'],
    ],
  })

  // TODO: this can be done offline when preparing the json
  addColoringScale({ auspiceData, key: 'region', value: UNKNOWN_VALUE, color: '#999999' })
  addColoringScale({ auspiceData, key: 'country', value: UNKNOWN_VALUE, color: '#999999' })
  addColoringScale({ auspiceData, key: 'division', value: UNKNOWN_VALUE, color: '#999999' })

  // TODO: this can be done offline when preparing the json
  auspiceData.meta.display_defaults = {
    branch_label: 'clade',
    color_by: 'Node type',
    distance_measure: 'div',
  }
  auspiceData.meta.panels = ['tree', 'entropy']
  auspiceData.meta.geo_resolutions = undefined

  const auspiceState = createStateFromQueryOrJSONs({ json: auspiceData, query: {} })

  // HACK: we are about to send the state object from this webworker process to the main process. However, `state.controls.colorScale.scale` is a function.
  // This will not work currently, because transferring between webworker processes uses structured cloning algorithm and functions are not supported.
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  // To workaround we unset the function here and set it back again (to a dummy one) on the other side.
  // Ideally, the state should not contain functions. This is something to discuss in auspice upstream.
  set(auspiceState, 'controls.colorScale.scale', undefined)

  return { auspiceData, auspiceState }
}
