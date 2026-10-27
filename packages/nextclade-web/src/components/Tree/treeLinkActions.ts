import type { AuspiceJsonV2 } from 'auspice'
import { colorTreeByPositions, showSequenceOnTree, type ShowOnTreeParams } from 'src/state/auspice/auspice.actions'
import { getTreeStore } from 'src/state/store'

/** Filter the tree to an analyzed sequence and zoom to a clade around it or not, for the next visit of the tree page */
export function showSequenceInTree(tree: AuspiceJsonV2, seqName: string, params: ShowOnTreeParams) {
  getTreeStore(tree).dispatch(showSequenceOnTree(seqName, params))
}

/** Color the tree by the genotype at 0-based positions of a CDS, or of `nuc`, for the next visit of the tree page */
export function colorTreeBy(tree: AuspiceJsonV2, cds: string, positions: number[]) {
  getTreeStore(tree).dispatch(colorTreeByPositions(cds, positions))
}
