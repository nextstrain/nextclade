import type { AnalysisResult, Gene, Translation, DatasetFlat, UrlParams } from 'src/algorithms/types'
import type { QCFilters } from 'src/filtering/filterByQCIssues'

export enum AlgorithmGlobalStatus {
  idle = 'idle',
  loadingData = 'loadingData',
  initWorkers = 'initWorkers',
  started = 'started',
  buildingTree = 'buildingTree',
  done = 'done',
  failed = 'failed',
}

export enum AlgorithmSequenceStatus {
  started = 'started',
  done = 'done',
  failed = 'failed',
}

export interface SequenceAnalysisState {
  id: number
  seqName: string
  status: AlgorithmSequenceStatus
  result?: AnalysisResult
  query?: string
  queryPeptides?: Translation[]
  warnings: Warnings
  errors: string[]
}

export interface ResultsFilters extends QCFilters {
  seqNamesFilter?: string
  mutationsFilter?: string
  aaFilter?: string
  cladesFilter?: string
}

export enum AlgorithmInputType {
  File = 'FileInput',
  Url = 'Url',
  String = 'String',
  Default = 'Default',
}

export interface AlgorithmInput {
  type: AlgorithmInputType
  name: string
  description: string

  getContent(): Promise<string>
}

export interface AlgorithmParams {
  datasets: DatasetFlat[]
  defaultDatasetName?: string
  defaultDatasetNameFriendly?: string
  datasetCurrent?: DatasetFlat
  urlParams: UrlParams
  raw: {
    seqData?: AlgorithmInput
    auspiceData?: AlgorithmInput
    rootSeq?: AlgorithmInput
    qcRulesConfig?: AlgorithmInput
    virusJson?: AlgorithmInput
    geneMap?: AlgorithmInput
    pcrPrimers?: AlgorithmInput
  }
  strings: {
    queryStr?: string
    queryName?: string
    refStr?: string
    refName?: string
    geneMapStr?: string
    treeStr?: string
    pcrPrimerCsvRowsStr?: string
    qcConfigStr?: string
    virusJsonStr?: string
  }
  final: {
    geneMap?: Gene[]
    genomeSize?: number
  }
  inProgress: {
    seqData: number
    auspiceData: number
    rootSeq: number
    qcRulesConfig: number
    virusJson: number
    geneMap: number
    pcrPrimers: number
  }
  errors: {
    seqData: Error[]
    auspiceData: Error[]
    rootSeq: Error[]
    qcRulesConfig: Error[]
    virusJson: Error[]
    geneMap: Error[]
    pcrPrimers: Error[]
  }
  seqData?: string
}

export interface AlgorithmState {
  status: AlgorithmGlobalStatus
  params: AlgorithmParams
  isDirty: boolean
  results: SequenceAnalysisState[]
  resultsFiltered: SequenceAnalysisState[]
  treeStr?: string
  resultsJsonStr?: string
  cladeNodeAttrKeys: string[]
  errors: string[]
  filters: ResultsFilters
  exportParams: ExportParams
}

export interface CladeAssignmentResult {
  seqName: string
  clade: string
}
