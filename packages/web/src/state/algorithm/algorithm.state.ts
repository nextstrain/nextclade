import type { AnalysisResult } from 'src/algorithms/types'

import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'
import { getFakeResults } from 'src/assets/data/getFakeResults'

export interface InputFile {
  name: string
  size: number
}

export interface AlgorithmParams {
  input: string
  rootSeq: string
}

export enum AlgorithmStatus {
  idling = 'idling',
  started = 'started',
  parsingStarted = 'parsingStarted',
  parsingDone = 'parsingDone',
  parsingFailed = 'parsingFailed',
  analysisStarted = 'analysisStarted',
  done = 'done',
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
  errors: string[]
}

export interface AlgorithmState {
  status: AlgorithmStatus
  inputFile?: InputFile
  params: AlgorithmParams
  isDirty: boolean
  results: SequenceAnylysisState[]
  resultsFiltered: SequenceAnylysisState[]
  errors: string[]
  cladesFilter?: string
  mutationsFilter?: string
}

let results: SequenceAnylysisState[] = []
if (process.env.DEBUG_SET_INITIAL_DATA === 'true') {
  results = getFakeResults()
}

export const agorithmDefaultState: AlgorithmState = {
  status: AlgorithmStatus.idling,
  params: {
    input: '',
    rootSeq: DEFAULT_ROOT_SEQUENCE,
  },
  isDirty: true,
  results,
  resultsFiltered: results,
  errors: [],
}
