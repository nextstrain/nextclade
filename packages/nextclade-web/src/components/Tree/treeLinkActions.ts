import type { AuspiceJsonV2 } from 'auspice'
import {
  colorTreeByPositions,
  showCladeOnTree,
  showSequenceOnTree,
  type ShowOnTreeParams,
} from 'src/state/auspice/auspice.actions'
import { getTreeStore } from 'src/state/store'

/** Filter the tree to an analyzed sequence and zoom to a clade around it or not, for the next visit of the tree page */
export function showSequenceInTree(tree: AuspiceJsonV2, seqName: string, params: ShowOnTreeParams) {
  getTreeStore(tree).dispatch(showSequenceOnTree(seqName, params))
}

/** Filter the tree to a value of a clade-like attribute and zoom to its tips or not, for the next visit of the tree page */
export function showCladeInTree(tree: AuspiceJsonV2, attrKey: string, value: string, params: ShowOnTreeParams) {
  getTreeStore(tree).dispatch(showCladeOnTree(attrKey, value, params))
}

/** Color the tree by the genotype at 0-based positions of a CDS, or of `nuc`, for the next visit of the tree page */
export function colorTreeBy(tree: AuspiceJsonV2, cds: string, positions: number[]) {
  getTreeStore(tree).dispatch(colorTreeByPositions(cds, positions))
}
