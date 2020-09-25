import type { Sorting } from 'src/helpers/sortResults'

import type { AuspiceJsonV2 } from 'auspice'
import type { QCResult } from 'src/algorithms/QC/types'
import type { AlgorithmParams, AnalysisResultWithoutClade } from 'src/algorithms/types'
import type { QCFilters } from 'src/filtering/filterByQCIssues'
import { getVirus } from 'src/algorithms/defaults/viruses'

export interface InputFile {
  name: string
  size: number
}

export type AlgorithmParamsPartial = Partial<AlgorithmParams>

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

export const algorithmDefaultState: AlgorithmState = {
  status: AlgorithmGlobalStatus.idling,
  params: {
    sequenceDatum: '',
    virus: getVirus(),
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
}
