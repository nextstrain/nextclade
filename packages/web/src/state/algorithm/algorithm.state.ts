import type { AuspiceJsonV2 } from 'auspice'

import type { Virus, AnalysisResult, Gene } from 'src/algorithms/types'
import type { Sorting } from 'src/helpers/sortResults'
import type { QCFilters } from 'src/filtering/filterByQCIssues'
import { getVirus } from 'src/algorithms/defaults/viruses'

export type AlgorithmParamsPartial = Partial<AlgorithmParams>

export enum AlgorithmGlobalStatus {
  idle = 'idle',
  loadingData = 'loadingData',
  initWorkers = 'initWorkers',
  started = 'started',
  buildingTree = 'buildingTree',
  done = 'done',
}

export enum AlgorithmSequenceStatus {
  idling = 'idling',
  queued = 'queued',
  started = 'started',
  done = 'done',
  failed = 'failed',
}

export interface SequenceAnalysisState {
  id: number
  seqName: string
  status: AlgorithmSequenceStatus
  result?: AnalysisResult
  errors: string[]
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
  strings: {
    queryStr?: string
    refStr?: string
    geneMapStr?: string
    treeStr?: string
    pcrPrimerCsvRowsStr?: string
    qcConfigStr?: string
  }
  final: {
    geneMap?: Gene[]
    genomeSize?: number
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
  status: AlgorithmGlobalStatus.idle,
  params: {
    raw: {},
    strings: {},
    final: {},
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
