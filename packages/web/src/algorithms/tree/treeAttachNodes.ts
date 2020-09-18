/* eslint-disable camelcase */
import { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'
import { groupBy, mapValues, set, unset, zip } from 'lodash'
import copy from 'fast-copy'
import { formatPrimer } from 'src/helpers/formatPrimer'

import i18n from 'src/i18n/i18n'
import { UNKNOWN_VALUE } from 'src/constants'
import type { AnalysisResult, AnalysisResultWithoutClade, Nucleotide } from 'src/algorithms/types'
import type { AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/enums'
import { formatQCPrivateMutations } from 'src/helpers/formatQCPrivateMutations'
import { formatQCMissingData } from 'src/helpers/formatQCMissingData'
import { formatQCSNPClusters } from 'src/helpers/formatQCSNPClusters'
import { formatRange } from 'src/helpers/formatRange'
import { formatQCMixedSites } from 'src/helpers/formatQCMixedSites'
import { notUndefined } from 'src/helpers/notUndefined'
import { parseMutationOrThrow } from 'src/algorithms/tree/parseMutationOrThrow'
import { formatAAMutationWithoutGene, formatMutation } from 'src/helpers/formatMutation'
import { isSequenced } from 'src/algorithms/tree/treeFindNearestNodes'

const t = i18n.t.bind(i18n)

export function isLeaf(node: AuspiceTreeNodeExtended) {
  return !node.children || node.children.length === 0
}

export function addAuxiliaryNode(baseNode: AuspiceTreeNodeExtended) {
  let newTerminal = copy(baseNode)
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
  set(new_node, 'mutations', copy(base_node.mutations))

  for (const mut of nucMutations) {
    const { pos, der } = parseMutationOrThrow(mut)
    new_node.mutations?.set(pos, der)
  }

  const children = base_node.children ?? []
  base_node.children = [new_node, ...children]
}

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
    pcrPrimerChanges,
    totalPcrPrimerChanges,
    qc,
  } = seq

  const qcStatus = qc?.overallStatus
  let qcFlags = 'Not available'
  if (qc) {
    const { privateMutations, snpClusters, mixedSites, missingData } = qc
    const messages = [
      formatQCMissingData(t, missingData),
      formatQCPrivateMutations(t, privateMutations),
      formatQCMixedSites(t, mixedSites),
      formatQCSNPClusters(t, snpClusters),
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

  const listOfPcrPrimerChanges = pcrPrimerChanges.map(formatPrimer).join(', ')
  const formattedPcrPrimerChanges =
    totalPcrPrimerChanges > 0 ? `(${totalPcrPrimerChanges}): ${listOfPcrPrimerChanges}` : 'None'

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
      'PCR primer changes': { value: formattedPcrPrimerChanges },
      'QC Status': { value: qcStatus },
      'QC Flags': { value: qcFlags },
    },
    mutations: new Map(),
  }
}

export interface FinalizeTreeParams {
  auspiceData: AuspiceJsonV2
  results: AnalysisResult[]
  matches: AuspiceTreeNode[]
  rootSeq: string
}

export interface FinalizeTreeResults {
  auspiceData: AuspiceJsonV2
}

export function treeAttachNodes({ auspiceData, results, matches, rootSeq }: FinalizeTreeParams): FinalizeTreeResults {
  zip(results, matches).forEach(([seq, match]) => {
    if (!seq || !match) {
      throw new Error(
        `Expected number of analysis results and number of match to be the same, but got:
            data.length: ${results.length}
            matches.length: ${matches.length}`,
      )
    }

    attach_to_tree(match, seq, rootSeq)
  })

  const focal_node = auspiceData?.tree
  if (!focal_node) {
    throw new Error(`Tree format not recognized: ".tree" is undefined`)
  }

  return { auspiceData }
}
