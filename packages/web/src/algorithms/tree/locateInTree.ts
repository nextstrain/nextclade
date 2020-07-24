/* eslint-disable camelcase */
import { cloneDeep, set } from 'lodash'

import type { AuspiceJsonV2, AuspiceTreeNode, AuspiceTreeNodeAttrs } from 'auspice'

import { formatMutation } from 'src/helpers/formatMutation'
import { parseMutation } from 'src/helpers/parseMutation'

import type { SequenceAnylysisState } from 'state/algorithm/algorithm.state'
import type { Nucleotide, AnalysisResult } from 'src/algorithms/types'
import { notUndefined } from 'helpers/notUndefined'
import { formatClades } from 'helpers/formatClades'

import auspiceDataRaw from 'src/assets/data/ncov_small.json'

export interface AuspiceTreeNodeAttrsExtended extends AuspiceTreeNodeAttrs {
  new_node?: { value?: string }
  QCStatus?: { value?: string }
}

export type MutationMap = Map<number, Nucleotide>

export interface AuspiceTreeNodeExtended extends AuspiceTreeNode<AuspiceTreeNodeAttrsExtended> {
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
  const qcStatus = seq.diagnostics.flags.length > 0 ? 'Fail' : 'Pass'

  return {
    branch_attrs: { mutations: {} },
    name: `${seq.seqName}_clades`,
    node_attrs: {
      clade_membership: { value: cladeStr },
      new_node: { value: 'Yes' },
      QCStatus: { value: qcStatus },
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
  const mutations: string[] = []
  const aminoacidMutations = {}

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
      mutations.push(mut)
      qmut.aaSubstitutions.forEach((d) => {
        if (aminoacidMutations[d.gene] === undefined) {
          aminoacidMutations[d.gene] = []
        }
        aminoacidMutations[d.gene].push(formatMutation({ pos: d.codon, queryNuc: d.queryAA, refNuc: d.refAA }))
      })
    }
  }

  return { mutations, aminoacidMutations }
}

export function closest_match(node: AuspiceTreeNodeExtended, seq: AnalysisResult) {
  let best = calculate_distance(node, seq)
  let best_node = node
  const children = node?.children ?? []
  for (const child of children) {
    const { best: tmp_best, best_node: tmp_best_node } = closest_match(child, seq)
    if (tmp_best < best) {
      best = tmp_best
      best_node = tmp_best_node
    }
  }

  return { best, best_node }
}

export function attach_to_tree(base_node: AuspiceTreeNodeExtended, seq: AnalysisResult, rootSeq: string) {
  if (!base_node?.children) {
    base_node.children = []
  }
  const { mutations } = get_differences(base_node, seq, rootSeq)
  const baseDiv = base_node?.node_attrs?.div ?? 0
  const div = baseDiv + mutations.length

  const new_node = get_node_struct(seq)
  set(new_node, 'branch_attrs.mutations.nuc', mutations)
  set(new_node, 'node_attrs.div', div)
  set(new_node, 'mutations', cloneDeep(base_node.mutations))

  for (const mut of mutations) {
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

  const mutations = new Map()
  mutations_on_tree(focal_node, mutations)

  data.forEach((seq) => {
    const { best_node } = closest_match(focal_node, seq)
    attach_to_tree(best_node, seq, rootSeq)
  })

  remove_mutations(focal_node)

  auspiceData.meta.colorings.push({ key: 'QCStatus', title: 'QC Status', type: 'categorical' })
  auspiceData.meta.colorings.push({ key: 'new_node', title: 'New Node', type: 'categorical' })

  auspiceData.meta.display_defaults = {
    branch_label: 'clade',
    color_by: 'new_node',
    distance_measure: 'div',
    geo_resolution: 'country',
    map_triplicate: true,
    transmission_lines: false,
  }

  return auspiceData
}
