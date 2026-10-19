import { isNil } from 'lodash'
import type { AnalysisError, NextcladeResult } from 'src/types'

/**
 * Return the name of the dataset that analyzes the sequence, or `undefined` for a sequence without a dataset
 * suggestion
 */
export function datasetNameForSequence(assignment: DatasetAssignment, seqIndex: number): string | undefined {
  if (assignment.seqIndicesWithoutDataset?.has(seqIndex)) {
    return undefined
  }
  return assignment.seqIndexToDatasetName?.get(seqIndex) ?? assignment.datasetNames[0]
}

/** Return the error rows of the sequences that the run assigned to the dataset */
export function selectDatasetErrors(
  results: ResultRow[],
  datasetName: string,
  assignment: DatasetAssignment,
): AnalysisError[] {
  return results.flatMap(({ index, seqName, error }) => {
    if (isNil(error) || datasetNameForSequence(assignment, index) !== datasetName) {
      return []
    }
    return [{ index, seqName, errors: [error] }]
  })
}

/**
 * Assignment of input sequences to datasets in one analysis run. A single-dataset run has one dataset and no
 * per-sequence map: every sequence belongs to that dataset.
 */
export interface DatasetAssignment {
  /** Names of the datasets of the run */
  datasetNames: string[]
  /** Dataset of each sequence in a multi-dataset run */
  seqIndexToDatasetName?: Map<number, string>
  /** Sequences without a dataset suggestion in a multi-dataset run */
  seqIndicesWithoutDataset?: Set<number>
}

/**
 * Result row as it arrives from the WebAssembly module. The module serializes an absent error as `null`, although the
 * generated type declares it optional.
 */
export interface ResultRow extends Pick<NextcladeResult, 'index' | 'seqName'> {
  error?: string | null
}
