/* eslint-disable camelcase */
import { cloneDeep, groupBy, set, mapValues } from 'lodash'

import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

import { formatAAMutationWithoutGene, formatMutation } from 'src/helpers/formatMutation'
import { parseMutation } from 'src/helpers/parseMutation'

import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import type { Nucleotide, AnalysisResult } from 'src/algorithms/types'
import { notUndefined } from 'src/helpers/notUndefined'
import { formatClades } from 'src/helpers/formatClades'

import auspiceDataRaw from 'src/assets/data/ncov_small.json'
import { formatRange } from 'src/helpers/formatRange'

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
    diagnostics,
    totalGaps,
    deletions,
    nonACGTNs,
    totalNonACGTNs,
    missing,
    totalMissing,
  } = seq
  const qcStatus = diagnostics.flags.length > 0 ? QCStatusType.Fail : QCStatusType.Pass
  const qcFlags = diagnostics.flags.join(', ')

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
      'QC Status': { value: qcStatus },
      'QC Flags': { value: qcFlags },
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

export function calculate_distance(node: AuspiceTreeNodeExtended, seq: AnalysisResult) {
  let shared_differences = 0
  let shared_sites = 0
  for (const qmut of seq.substitutions) {
    const der = node.mutations?.get(qmut.pos)
    if (der) {
      if (qmut.queryNuc === der) {
        shared_differences += 1
      } else {
        shared_sites += 1
      }
    }
  }
  let undetermined_sites = 0
  if (node.mutations) {
    for (const nmut of node.mutations) {
      const pos = nmut[0]
      if (
        pos < seq.alignmentStart ||
        pos >= seq.alignmentEnd ||
        !seq.missing.every((d) => pos < d.begin && pos >= d.end)
      ) {
        undetermined_sites += 1
      }
    }
  }

  const numMut = node.mutations?.size ?? 0
  return numMut + seq.substitutions.length - 2 * shared_differences - shared_sites - undetermined_sites
}

export function get_differences(node: AuspiceTreeNodeExtended, seq: AnalysisResult, root_seq: string) {
  const nucMutations: string[] = []
  let aminoacidMutationEntries: { gene: string; aaMut: string }[] = []

  for (const qmut of seq.substitutions) {
    const { pos, queryNuc } = qmut
    const der = node.mutations?.get(pos)

    let refNuc
    if (der) {
      if (queryNuc !== der) {
        refNuc = der
      }
    } else {
      refNuc = root_seq[pos] as Nucleotide
    }

    if (refNuc) {
      const mut = formatMutation({ refNuc, pos, queryNuc })
      nucMutations.push(mut)

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

export function addAuxillaryNode(node: AuspiceTreeNodeExtended) {
  const newTerminal = cloneDeep(node)
  newTerminal.branch_attrs.mutations = { nuc: [] }
  node.children = [newTerminal]
  node['name'] = newTerminal['name'] + '_parent'
  if (node.node_attrs['author']) {
    delete node.node_attrs['author']
  }
  if (node.node_attrs['url']) {
    delete node.node_attrs['url']
  }
}

export function attach_to_tree(base_node: AuspiceTreeNodeExtended, seq: AnalysisResult, rootSeq: string) {
  if (!base_node.children) {
    addAuxillaryNode(base_node)
  }
  const { mutations, nucMutations, totalNucMutations } = get_differences(base_node, seq, rootSeq)
  const baseDiv = base_node.node_attrs?.div ?? 0
  const div = baseDiv + totalNucMutations

  const new_node = get_node_struct(seq)
  set(new_node, 'branch_attrs.mutations', mutations)
  set(new_node, 'node_attrs.div', div)
  set(new_node, 'mutations', cloneDeep(base_node.mutations))

  for (const mut of nucMutations) {
    const { pos, der } = parseMutationOrThrow(mut)
    new_node.mutations?.set(pos, der)
  }

  base_node.children.splice(0, 0, new_node)
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

export function locateInTree(result: SequenceAnylysisState[], rootSeq: string) {
  const succeeded = result.map((result) => result.result).filter(notUndefined)
  const data = cloneDeep(succeeded)
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

  data.forEach((seq) => {
    const { best_node } = closest_match(focal_node, seq)
    attach_to_tree(best_node, seq, rootSeq)
  })

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

  auspiceData.meta.display_defaults = {
    branch_label: 'clade',
    color_by: 'Node type',
    distance_measure: 'div',
  }
  auspiceData.meta.panels = []
  auspiceData.meta.geo_resolutions = undefined

  return auspiceData
}
