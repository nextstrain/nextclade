import { Nucleotide } from 'src/algorithms/types'
import { AuspiceTreeNode } from 'auspice'

export type MutationMap = Map<number, Nucleotide>

export interface AuspiceTreeNodeExtended extends AuspiceTreeNode {
  mutations?: MutationMap
}
