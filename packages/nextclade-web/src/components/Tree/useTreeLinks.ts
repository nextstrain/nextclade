import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { useEffectiveDataset } from 'src/hooks/useEffectiveDataset'
import { globalErrorAtom } from 'src/state/error.state'
import { treeAtom } from 'src/state/results.state'
import { isPlacedSequenceAlone } from 'src/components/Tree/treeNodeNames'
import type { ShowOnTreeParams } from 'src/state/auspice/auspice.actions'

/** Name of the nucleotide sequence in genotype colorings, as opposed to CDS names */
const NUCLEOTIDES = 'nuc'

/** Links from the results to the tree page of the viewed dataset, available when its tree is ready */
export interface TreeLinks {
  /** Whether the tree has a tip of its own for the analyzed sequence of this name */
  canShowSequence(seqName: string): boolean
  /** Open the tree page, filtered to the sequence alone or added to the selected sequences, and zoomed or not */
  showSequence(seqName: string, params: ShowOnTreeParams): void
  /** Whether the tree can be colored by positions of this CDS, or of the nucleotide sequence (`nuc`) */
  canColorBy(cds: string): boolean
  /** Open the tree page, colored by the genotype at the given 0-based positions of a CDS, or of `nuc` */
  colorByPositions(cds: string, positions: number[]): void
}

/**
 * Return the links from the results to the tree of the viewed dataset, or `undefined` while there is no tree. The links
 * change the Auspice store of the tree, which the tree page draws when it opens. The Auspice code loads on the first
 * use, as the tree page loads it, so that the results page does not load it
 */
export function useTreeLinks(): TreeLinks | undefined {
  const router = useRouter()
  const setGlobalError = useSetRecoilState(globalErrorAtom)
  const { effectiveDatasetPath } = useEffectiveDataset()
  const tree = useRecoilValue(treeAtom(effectiveDatasetPath ?? ''))

  return useMemo(() => {
    if (!tree) {
      return undefined
    }
    function openTreePage(change: (actions: TreeLinkActions) => void) {
      import('src/components/Tree/treeLinkActions')
        .then((actions) => {
          change(actions)
          return router.push('/tree')
        })
        .catch((error: unknown) => setGlobalError(sanitizeError(error)))
    }
    const cdsNames = new Set([NUCLEOTIDES, ...Object.keys(tree.meta?.genome_annotations ?? {})])
    return {
      canShowSequence(seqName: string) {
        return isPlacedSequenceAlone(tree, seqName)
      },
      showSequence(seqName: string, params: ShowOnTreeParams) {
        openTreePage(({ showSequenceInTree }) => showSequenceInTree(tree, seqName, params))
      },
      canColorBy(cds: string) {
        return cdsNames.has(cds)
      },
      colorByPositions(cds: string, positions: number[]) {
        openTreePage(({ colorTreeBy }) => colorTreeBy(tree, cds, positions))
      },
    }
  }, [router, setGlobalError, tree])
}

/**
 * Return a function that opens the tree page colored by the genotype at 0-based positions of a CDS, or of the nucleotide
 * sequence (`nuc`), or `undefined` while the tree is not ready or cannot be colored by the CDS
 */
export function useColorTreeBy(cds: string): ((positions: number[]) => void) | undefined {
  const treeLinks = useTreeLinks()
  return useMemo(() => {
    if (!treeLinks?.canColorBy(cds)) {
      return undefined
    }
    return (positions: number[]) => treeLinks.colorByPositions(cds, positions)
  }, [cds, treeLinks])
}

type TreeLinkActions = typeof import('src/components/Tree/treeLinkActions')
