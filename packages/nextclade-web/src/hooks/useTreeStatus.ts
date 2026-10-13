import { useAtomValue } from 'jotai'
import { isNil } from 'lodash'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { analysisStatusGlobalAtom, datasetHasTreeAtom, treeAtom } from 'src/state/results.state'
import { AlgorithmGlobalStatus } from 'src/types'

/** Return availability of the output tree of the given dataset */
export function useTreeStatus(datasetName: string | undefined): TreeStatus {
  const analysisStatus = useAtomValue(analysisStatusGlobalAtom)
  const hasTree = useRecoilValue(datasetHasTreeAtom({ datasetName: datasetName ?? '' }))
  const tree = useRecoilValue(treeAtom(datasetName ?? ''))
  return useMemo(
    () => getTreeStatus({ analysisStatus, hasTree, isTreeAvailable: !isNil(tree) }),
    [analysisStatus, hasTree, tree],
  )
}

/** Return availability of the output tree, given the analysis progress */
export function getTreeStatus({ analysisStatus, hasTree, isTreeAvailable }: GetTreeStatusParams): TreeStatus {
  if (isTreeAvailable) {
    return 'ready'
  }
  if (hasTree === false) {
    return 'absent'
  }
  if (analysisStatus === AlgorithmGlobalStatus.idle) {
    return 'notRun'
  }
  if (analysisStatus === AlgorithmGlobalStatus.failed) {
    return 'failed'
  }
  if (isNil(hasTree)) {
    return 'pending'
  }
  // The tree arrives just before the `done` status, so `done` without a tree is the moment of delivery
  if (analysisStatus === AlgorithmGlobalStatus.buildingTree || analysisStatus === AlgorithmGlobalStatus.done) {
    return 'building'
  }
  return 'analyzing'
}

/**
 * Availability of the output tree of a dataset during and after the analysis:
 *  - `notRun`: no analysis was run
 *  - `pending`: analysis is loading the dataset; whether there will be a tree is not known yet
 *  - `analyzing`: tree is expected; sequences are being analyzed
 *  - `building`: tree is expected; sequences are being placed on the reference tree
 *  - `ready`: tree is available
 *  - `absent`: dataset has no reference tree, so there will be no tree
 *  - `failed`: analysis failed before the tree was built
 */
export type TreeStatus = 'notRun' | 'pending' | 'analyzing' | 'building' | 'ready' | 'absent' | 'failed'

export interface GetTreeStatusParams {
  analysisStatus: AlgorithmGlobalStatus
  /** Whether the analysis outputs a tree, or undefined while not known yet */
  hasTree: boolean | undefined
  /** Whether the output tree is available */
  isTreeAvailable: boolean
}
