import type { StrictOmit } from 'ts-essentials'
import type { AuspiceJsonV2 } from 'auspice'

import type { Virus, AnalysisResultWithMatch, AnalysisResult } from 'src/algorithms/types'
import type { Sorting } from 'src/helpers/sortResults'
import type { QCFilters } from 'src/filtering/filterByQCIssues'
import { getVirus } from 'src/algorithms/defaults/viruses'

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

export interface SequenceAnalysisState {
  id: number
  seqName: string
  status: AlgorithmSequenceStatus
  result?: AnalysisResult
  errors: string[]
}

export interface SequenceAnalysisStateWithMatch extends StrictOmit<SequenceAnalysisState, 'result'> {
  result?: AnalysisResultWithMatch
}

export interface ResultsFilters extends QCFilters {
  seqNamesFilter?: string
  mutationsFilter?: string
  aaFilter?: string
  cladesFilter?: string
  sorting?: Sorting
}

export enum AlgorithmInputType {
  File = 'FileInput',
  Url = 'Url',
  String = 'String',
}

export interface AlgorithmInput {
  type: AlgorithmInputType
  name: string
  description: string

  getContent(): Promise<string>
}

export interface AlgorithmParams {
  raw: {
    seqData?: AlgorithmInput
    auspiceData?: AlgorithmInput
    rootSeq?: AlgorithmInput
    qcRulesConfig?: AlgorithmInput
    geneMap?: AlgorithmInput
    pcrPrimers?: AlgorithmInput
  }
  errors: {
    seqData: Error[]
    auspiceData: Error[]
    rootSeq: Error[]
    qcRulesConfig: Error[]
    geneMap: Error[]
    pcrPrimers: Error[]
  }
  seqData?: string
  virus: Virus
}

export interface AlgorithmState {
  status: AlgorithmGlobalStatus
  params: AlgorithmParams
  isDirty: boolean
  results: SequenceAnalysisState[]
  resultsFiltered: SequenceAnalysisState[]
  tree: AuspiceJsonV2
  errors: string[]
  filters: ResultsFilters
  outputTree?: string
}

export interface CladeAssignmentResult {
  seqName: string
  clade: string
}

export const algorithmDefaultState: AlgorithmState = {
  status: AlgorithmGlobalStatus.idling,
  params: {
    raw: {},
    errors: {
      seqData: [],
      auspiceData: [],
      rootSeq: [],
      qcRulesConfig: [],
      geneMap: [],
      pcrPrimers: [],
    },
    seqData: undefined,
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
  outputTree: undefined,
}
