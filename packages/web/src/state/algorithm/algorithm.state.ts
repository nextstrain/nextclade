import type { Sorting } from 'src/helpers/sortResults'

import { DEFAULT_ROOT_SEQUENCE } from 'src/algorithms/getRootSeq'
// import { getFakeResults } from 'src/assets/data/getFakeResults'
import type { AuspiceJsonV2 } from 'auspice'
import type { QCResult } from 'src/algorithms/QC/runQC'
import type { AnalysisResultWithoutClade } from 'src/algorithms/types'
import type { QCFilters } from 'src/filtering/filterByQCIssues'

export interface InputFile {
  name: string
  size: number
}

export interface AlgorithmParams {
  input: string
  rootSeq: string
}

export enum AlgorithmGlobalStatus {
  idling = 'idling',
  started = 'started',
  parsing = 'parsing',
  analysis = 'analysis',
  treeBuild = 'treeBuild',
  assignClades = 'assignClades',
  qc = 'qc',
  treeFinalization = 'treeFinalization',
  allDone = 'allDone',
}

export enum AlgorithmSequenceStatus {
  idling = 'idling',
  analysisStarted = 'analysisStarted',
  analysisDone = 'analysisDone',
  analysisFailed = 'analysisFailed',
  qcStarted = 'qcStarted',
  qcDone = 'qcDone',
  qcFailed = 'qcFailed',
}

export interface AnalysisResultState extends AnalysisResultWithoutClade {
  clade?: string
}

export interface SequenceAnalysisState {
  id: number
  seqName: string
  status: AlgorithmSequenceStatus
  result?: AnalysisResultState
  qc?: QCResult
  errors: string[]
}

export interface ResultsFilters extends QCFilters {
  seqNamesFilter?: string
  mutationsFilter?: string
  aaFilter?: string
  cladesFilter?: string
  sorting?: Sorting
}

export interface AlgorithmState {
  status: AlgorithmGlobalStatus
  inputFile?: InputFile
  params: AlgorithmParams
  isDirty: boolean
  results: SequenceAnalysisState[]
  resultsFiltered: SequenceAnalysisState[]
  tree: AuspiceJsonV2
  errors: string[]
  filters: ResultsFilters
}

export interface CladeAssignmentResult {
  seqName: string
  clade: string
}

const fakeState: Partial<AlgorithmState> = {}
if (process.env.DEBUG_SET_INITIAL_DATA === 'true') {
  // fakeState.results = getFakeResults()
  // fakeState.resultsFiltered = fakeState.results
  // fakeState.status = AlgorithmGlobalStatus.done
}

export const algorithmDefaultState: AlgorithmState = {
  status: AlgorithmGlobalStatus.idling,
  params: {
    input: '',
    rootSeq: DEFAULT_ROOT_SEQUENCE,
  },
  isDirty: true,
  results: [],
  resultsFiltered: [],
  tree: {},
  errors: [],
  filters: {
    showGood: true,
    showMediocre: true,
    showBad: true,
    showErrors: true,
  },
  ...fakeState,
}
