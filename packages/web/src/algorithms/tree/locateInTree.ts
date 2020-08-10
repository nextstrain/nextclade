/* eslint-disable camelcase */
import { cloneDeep, groupBy, set, mapValues, unset, zip } from 'lodash'

import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

import { formatAAMutationWithoutGene, formatMutation } from 'src/helpers/formatMutation'
import { parseMutation } from 'src/helpers/parseMutation'

import type { Nucleotide, AnalysisResult } from 'src/algorithms/types'
import { notUndefined } from 'src/helpers/notUndefined'
import { formatClades } from 'src/helpers/formatClades'

import auspiceDataRaw from 'src/assets/data/ncov_small.json'
import { formatRange } from 'src/helpers/formatRange'
import { UNKNOWN_VALUE } from 'src/constants'
import { QCResult } from 'src/algorithms/QC/runQC'

export type MutationMap = Map<number, Nucleotide>

export enum NodeType {
  New = 'New',
  Reference = 'Reference',
}

export enum QCStatusType {
  Pass = 'Pass',
  Fail = 'Fail',
}

export interface AuspiceTreeNodeExtended extends AuspiceTreeNode {
  mutations?: MutationMap
}

export function parseMutationOrThrow(mut: string) {
  const parsedMut = parseMutation(mut)
  if (!parsedMut) {
    throw new Error(`Mutation cannot be parsed: "${mut}"`)
  }

  const { refNuc, pos, queryNuc } = parsedMut
  if (!refNuc || pos === undefined || !queryNuc) {
    throw new Error(`Mutation cannot be parsed: "${mut}"`)
  }

  return { anc: refNuc, pos, der: queryNuc }
}

export function get_node_struct(seq: AnalysisResult): AuspiceTreeNodeExtended {
  const { cladeStr } = formatClades(seq.clades)
  const {
    alignmentStart,
    alignmentEnd,
    alignmentScore,
    // diagnostics,
    totalGaps,
    deletions,
    nonACGTNs,
    totalNonACGTNs,
    missing,
    totalMissing,
  } = seq
  // const qcStatus = diagnostics.flags.length > 0 ? QCStatusType.Fail : QCStatusType.Pass
  // const qcFlags = diagnostics.flags.join(', ')

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
      'clade_membership': { value: cladeStr },
      'Node type': { value: NodeType.New },
      'Alignment': { value: alignment },
      'Missing:': { value: formattedMissing },
      'Gaps': { value: formattedGaps },
      'Non-ACGTNs': { value: formattedNonACGTNs },
      // 'QC Status': { value: qcStatus },
      // 'QC Flags': { value: qcFlags },
    },
    mutations: new Map(),
  }
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

export function isSequenced(pos: number, seq: AnalysisResult) {
  return pos >= seq.alignmentStart && pos < seq.alignmentEnd && seq.missing.every((d) => pos < d.begin || pos >= d.end)
}

export function calculate_distance(node: AuspiceTreeNodeExtended, seq: AnalysisResult) {
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

export function get_differences(node: AuspiceTreeNodeExtended, seq: AnalysisResult, root_seq: string) {
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

export function closest_match(node: AuspiceTreeNodeExtended, seq: AnalysisResult) {
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

export function setNodeTypes(node: AuspiceTreeNode) {
  set(node, `node_attrs['Node type']`, { value: NodeType.Reference })
  node.children?.forEach(setNodeTypes)
}

export interface AddColoringScaleParams {
  auspiceData: AuspiceJsonV2
  key: string
  value: string
  color: string
}

export function addColoringScale({ auspiceData, key, value, color }: AddColoringScaleParams) {
  const coloring = auspiceData.meta.colorings.find((coloring) => coloring.key === key)
  coloring?.scale?.unshift([UNKNOWN_VALUE, color])
}

export function locateInTree(analysisResultsRaw: AnalysisResult[], rootSeq: string) {
  const succeeded = analysisResultsRaw.filter(notUndefined)
  const analysisResults = cloneDeep(succeeded)
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

  setNodeTypes(focal_node)

  const mutations = new Map()
  mutations_on_tree(focal_node, mutations)

  const matches = analysisResults.map((seq) => closest_match(focal_node, seq).best_node)
  return { matches, auspiceData }
}

export interface FinalizeTreeParams {
  auspiceData: AuspiceJsonV2
  analysisResults: AnalysisResult[]
  matches: AuspiceTreeNode[]
  qcResults: QCResult[]
  rootSeq: string
}

export function finalizeTree({ auspiceData, analysisResults, matches, qcResults, rootSeq }: FinalizeTreeParams) {
  const succeeded = analysisResults.filter(notUndefined)
  const analysisResultsSucceeded = cloneDeep(succeeded)

  zip(analysisResultsSucceeded, matches).forEach(([seq, match]) => {
    if (!seq || !match) {
      throw new Error(
        `Expected number of analysis results and number of match to be the same, but got:
            data.length: ${analysisResultsSucceeded.length}
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

  auspiceData.meta.colorings.unshift({
    key: 'QC Status',
    title: 'QC Status',
    type: 'categorical',
    scale: [
      [QCStatusType.Pass, '#417C52'],
      [QCStatusType.Fail, '#CA738E'],
    ],
  })

  auspiceData.meta.colorings.unshift({
    key: 'Node type',
    title: 'Node type',
    type: 'categorical',
    scale: [
      [NodeType.New, '#ff6961'],
      [NodeType.Reference, '#999999'],
    ],
  })

  addColoringScale({ auspiceData, key: 'region', value: UNKNOWN_VALUE, color: '#999999' })
  addColoringScale({ auspiceData, key: 'country', value: UNKNOWN_VALUE, color: '#999999' })
  addColoringScale({ auspiceData, key: 'division', value: UNKNOWN_VALUE, color: '#999999' })

  auspiceData.meta.display_defaults = {
    branch_label: 'clade',
    color_by: 'Node type',
    distance_measure: 'div',
  }
  auspiceData.meta.panels = ['tree', 'entropy']
  auspiceData.meta.geo_resolutions = undefined

  return auspiceData
}
