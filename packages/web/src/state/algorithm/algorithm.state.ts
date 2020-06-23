import DEFAULT_INPUT from 'src/assets/data/defaultSequencesWithGaps.fasta'
import DEFAULT_ROOT_SEQUENCE from 'src/assets/data/defaultRootSequence.txt'
import { AnalysisResult } from 'src/algorithms/types'

export interface AlgorithmState {
  params: {
    input: string
    rootSeq: string
  }
  results?: AnalysisResult
}

export const agorithmDefaultState: AlgorithmState = {
  params: {
    input: DEFAULT_INPUT,
    rootSeq: DEFAULT_ROOT_SEQUENCE,
  },
}
