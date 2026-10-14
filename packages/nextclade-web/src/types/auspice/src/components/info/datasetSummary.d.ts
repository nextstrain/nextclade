declare module 'auspice/src/components/info/datasetSummary' {
  import type { AuspiceTreeNode } from 'auspice'

  export interface DatasetSummaryParams {
    nodes: AuspiceTreeNode[]
    visibility: number[]
    mainTreeNumTips: number
    branchLengthsToDisplay?: string
    t: unknown
  }

  /** Return a sentence telling how many of the tree's tips are shown, e.g. "Showing 10 of 20 genomes." */
  export function datasetSummary(params: DatasetSummaryParams): string
}
