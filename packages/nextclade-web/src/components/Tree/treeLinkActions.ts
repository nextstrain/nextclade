import type { AuspiceJsonV2 } from 'auspice'
import { colorTreeByPositions, showSequenceOnTree } from 'src/state/auspice/auspice.actions'
import { getTreeStore } from 'src/state/store'

/** Filter the tree to an analyzed sequence and zoom to a clade around it, for the next visit of the tree page */
export function showSequenceInTree(tree: AuspiceJsonV2, seqName: string) {
  getTreeStore(tree).dispatch(showSequenceOnTree(seqName))
}

/** Color the tree by the genotype at 0-based positions of a CDS, or of `nuc`, for the next visit of the tree page */
export function colorTreeBy(tree: AuspiceJsonV2, cds: string, positions: number[]) {
  getTreeStore(tree).dispatch(colorTreeByPositions(cds, positions))
}
