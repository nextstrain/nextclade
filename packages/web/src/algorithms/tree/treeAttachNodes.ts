/* eslint-disable camelcase */
import { groupBy, isEqual, mapValues, set, uniqWith, unset } from 'lodash'
import copy from 'fast-copy'

import i18n from 'src/i18n/i18n'
import { UNKNOWN_VALUE } from 'src/constants'

import type {
  AnalysisResult,
  AnalysisResultWithMatch,
  AnalysisResultWithoutClade,
  Nucleotide,
} from 'src/algorithms/types'
import type { AuspiceJsonV2Extended, AuspiceTreeNodeExtended } from 'src/algorithms/tree/types'
import { NodeType } from 'src/algorithms/tree/enums'
import { formatQCPrivateMutations } from 'src/helpers/formatQCPrivateMutations'
import { formatQCMissingData } from 'src/helpers/formatQCMissingData'
import { formatQCSNPClusters } from 'src/helpers/formatQCSNPClusters'
import { formatQCMixedSites } from 'src/helpers/formatQCMixedSites'
import { formatPrimer } from 'src/helpers/formatPrimer'
import { formatRange } from 'src/helpers/formatRange'
import { notUndefined } from 'src/helpers/notUndefined'
import { parseMutationOrThrow } from 'src/algorithms/tree/parseMutationOrThrow'
import { formatAAMutationWithoutGene, formatMutation } from 'src/helpers/formatMutation'
import { GAP } from 'src/algorithms/nucleotides'
import { AMINOACID_GAP } from 'src/algorithms/codonTable'
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
  let totalNucMutations = 0

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
      totalNucMutations += 1
      // TODO: these are amino acid mutations relative to reference. Double hits won't how up properly
      const aminoacidMutationEntriesNew = qmut.aaSubstitutions.map(({ codon, gene, queryAA, refAA }) => {
        const aaMut = formatAAMutationWithoutGene({ refAA, codon, queryAA })
        return { gene, aaMut }
      })

      aminoacidMutationEntries = [...aminoacidMutationEntries, ...aminoacidMutationEntriesNew]
    }
  }

  for (const del of seq.deletions) {
    for (let pos = del.start; pos < del.start + del.length; ++pos) {
      const queryNuc = GAP
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

        const aminoacidMutationEntriesNew = del.aaDeletions.map(({ codon, gene, refAA }) => {
          const aaMut = formatAAMutationWithoutGene({ refAA, codon, queryAA: AMINOACID_GAP })
          return { gene, aaMut }
        })

        aminoacidMutationEntries = [...aminoacidMutationEntries, ...aminoacidMutationEntriesNew]
      }
    }
  }

  aminoacidMutationEntries = uniqWith(aminoacidMutationEntries, isEqual)

  const aminoacidMutationsGrouped = groupBy(aminoacidMutationEntries, ({ gene }) => gene)
  const aminoacidMutationsFinal = mapValues(aminoacidMutationsGrouped, (aaMuts) => aaMuts.map(({ aaMut }) => aaMut))
  const mutations = {
    nuc: nucMutations,
    ...aminoacidMutationsFinal,
  }

  for (const mut of node.mutations ?? []) {
    const pos = mut[0]
    // mutation in node that is not present in node
    if (!positionsCovered.has(pos) && isSequenced(pos, seq) && mut[1] !== GAP) {
      const refNuc = root_seq[pos] as Nucleotide
      const mutStr = formatMutation({ refNuc: mut[1], pos, queryNuc: refNuc })
      nucMutations.push(mutStr)
      totalNucMutations += 1
    }
  }

  return { mutations, nucMutations, totalNucMutations }
}

export function attach_to_tree(
  result: AnalysisResult,
  nearestRefNode: AuspiceTreeNodeExtended,
  rootSeq: string,
  maxDivergence: number,
) {
  if (isLeaf(nearestRefNode)) {
    addAuxiliaryNode(nearestRefNode)
  }

  const { mutations, nucMutations, totalNucMutations } = get_differences(nearestRefNode, result, rootSeq)
  const baseDiv = nearestRefNode.node_attrs?.div ?? 0

  // HACK: Guess the unit of measurement of divergence.
  // Taken from: https://github.com/nextstrain/auspice/blob/6a2d0f276fccf05bfc7084608bb0010a79086c83/src/components/tree/phyloTree/renderers.js#L376
  //  Should be resolved upstream in augur/auspice.
  let thisDiv = totalNucMutations // unit: number of substitutions
  if (maxDivergence <= 5) {
    thisDiv /= rootSeq.length // unit: number of substitutions per site
  }
  const div = baseDiv + thisDiv

  const new_node = get_node_struct(result)
  set(new_node, 'branch_attrs.mutations', mutations)
  set(new_node, 'node_attrs.div', div)
  set(new_node, 'node_attrs.region', { value: UNKNOWN_VALUE })
  set(new_node, 'node_attrs.country', { value: UNKNOWN_VALUE })
  set(new_node, 'node_attrs.division', { value: UNKNOWN_VALUE })
  set(new_node, 'mutations', copy(nearestRefNode.mutations))

  for (const mut of nucMutations) {
    const { pos, queryNuc } = parseMutationOrThrow(mut)
    new_node.mutations?.set(pos, queryNuc)
  }

  const children = nearestRefNode.children ?? []
  nearestRefNode.children = [new_node, ...children]
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
    id: -1,
    children: undefined,
    mutations: undefined,
    branch_attrs: { mutations: {} },
    name: `${seq.seqName}_new`,
    node_attrs: {
      'clade_membership': { value: seq.clade },
      'Node type': { value: NodeType.New },
      'Alignment': { value: alignment },
      'Missing:': { value: formattedMissing },
      'Gaps': { value: formattedGaps },
      'Non-ACGTNs': { value: formattedNonACGTNs },
      'Has PCR primer changes': { value: totalPcrPrimerChanges > 0 ? 'Yes' : 'No' },
      'PCR primer changes': { value: formattedPcrPrimerChanges },
      'QC Status': { value: qcStatus },
      'QC Flags': { value: qcFlags },
    },
  }
}

export function attachNewNodesRecursively(
  node: AuspiceTreeNodeExtended,
  results: AnalysisResultWithMatch[],
  rootSeq: string,
  maxDivergence: number,
) {
  for (const child of node.children ?? []) {
    attachNewNodesRecursively(child, results, rootSeq, maxDivergence)
  }

  // We look for a matching result, by it's unique `id`
  const attachables = results.filter((result) => result.nearestTreeNodeId === node.id)
  attachables.forEach((attachable) => {
    attach_to_tree(attachable, node, rootSeq, maxDivergence)
  })

  return node
}

export function getMaxDivergence(node: AuspiceTreeNodeExtended) {
  const div = node?.node_attrs?.div ?? -Infinity

  let childDiv = -Infinity
  for (const child of node?.children ?? []) {
    const currChildDiv = getMaxDivergence(child)
    childDiv = Math.max(childDiv, currChildDiv)
  }

  return Math.max(div, childDiv)
}

export interface FinalizeTreeParams {
  auspiceData: AuspiceJsonV2Extended
  results: AnalysisResultWithMatch[]
  rootSeq: string
}

export function treeAttachNodes({ auspiceData, results, rootSeq }: FinalizeTreeParams): AuspiceJsonV2Extended {
  const rootNode = auspiceData.tree
  if (!rootNode) {
    throw new Error('Error: invalid tree: it does not contain any nodes')
  }

  const maxDivergence = getMaxDivergence(rootNode)

  const tree = attachNewNodesRecursively(rootNode, results, rootSeq, maxDivergence)
  return { ...auspiceData, tree }
}
