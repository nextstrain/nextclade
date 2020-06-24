import DEFAULT_INPUT from 'src/assets/data/defaultSequencesWithGaps.fasta'
import DEFAULT_ROOT_SEQUENCE from 'src/assets/data/defaultRootSequence.txt'
import { AnalysisResult } from 'src/algorithms/types'

export enum AlgorithmStatus {
  idling = 'idling',
  started = 'started',
  parsingStarted = 'parsingStarted',
  parsingDone = 'parsingDone',
  parsingFailed = 'parsingFailed',
  analysisStarted = 'analysisStarted',
  done = 'done',
  failed = 'failed',
}

export enum AnylysisStatus {
  idling = 'idling',
  started = 'started',
  done = 'done',
  failed = 'failed',
}

export interface SequenceAnylysisState {
  status: AnylysisStatus
  seqName: string
  result?: AnalysisResult
}

export interface AlgorithmState {
  status: AlgorithmStatus
  params: {
    input: string
    rootSeq: string
  }
  results: SequenceAnylysisState[]
  error?: Error
}

export const agorithmDefaultState: AlgorithmState = {
  status: AlgorithmStatus.idling,
  params: {
    input: DEFAULT_INPUT,
    rootSeq: DEFAULT_ROOT_SEQUENCE,
  },
  results: [],
  error: undefined,
}
