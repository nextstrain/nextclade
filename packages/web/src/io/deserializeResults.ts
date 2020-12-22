import type { StrictOmit } from 'ts-essentials'

import type { AnalysisResultWithMatch } from 'src/algorithms/types'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'

export interface AnalysisResultSerialized
  extends StrictOmit<AnalysisResultWithMatch, 'alignedQuery' | 'nucleotideComposition'> {
  errors: string[]
}

export type NextcladeJson = AnalysisResultSerialized[]

export function deserializeJsonToResults(json: NextcladeJson): SequenceAnalysisState[] {
  return json.map((result, id) => {
    const status =
      result.errors.length > 0 ? AlgorithmSequenceStatus.analysisFailed : AlgorithmSequenceStatus.analysisDone

    const resultInternal: AnalysisResultWithMatch = {
      ...result,
      alignedQuery: '',
      nucleotideComposition: {},
      qc: { ...result.qc, seqName: result.seqName },
    }

    return {
      id,
      seqName: result.seqName,
      status,
      result: resultInternal,
      errors: result.errors,
    }
  })
}
