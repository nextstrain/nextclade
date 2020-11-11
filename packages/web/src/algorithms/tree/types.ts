import { Nucleotide } from 'src/algorithms/types'
import { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

export type MutationMap = Map<number, Nucleotide>

export interface AuspiceTreeNodeExtended extends AuspiceTreeNode {
  id: number
  mutations?: MutationMap
  substitutions?: MutationMap
  children?: AuspiceTreeNodeExtended[]
}

export interface AuspiceJsonV2Extended extends AuspiceJsonV2 {
  tree?: AuspiceTreeNodeExtended
}
