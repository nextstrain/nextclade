import type { AuspiceTreeNode } from 'auspice'
import type { Nucleotide } from 'src/algorithms/types'

export enum NodeType {
  New = 'New',
  Reference = 'Reference',
}

export type MutationMap = Map<number, Nucleotide>

export enum QCStatusType {
  Pass = 'Pass',
  Fail = 'Fail',
}

export interface AuspiceTreeNodeExtended extends AuspiceTreeNode {
  mutations?: MutationMap
}
