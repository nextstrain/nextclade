import type { AnalysisResult, Gene, Peptide, Warnings, DatasetFlat, UrlParams } from 'src/algorithms/types'
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
  query?: string
  queryPeptides?: Peptide[]
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
}

export interface AlgorithmInput {
  type: AlgorithmInputType
  name: string
  description: string

  getContent(): Promise<string>
}

export interface ExportParams {
  filenameZip: string
  filenameCsv: string
  filenameTsv: string
  filenameJson: string
  filenameTreeJson: string
  filenameFasta: string
  filenamePeptidesZip: string
  filenameInsertionsCsv: string
  filenameErrorsCsv: string
  filenamePeptidesTemplate: string
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

export const DEFAULT_EXPORT_PARAMS: ExportParams = {
  filenameZip: 'nextclade.zip',
  filenameCsv: 'nextclade.csv',
  filenameTsv: 'nextclade.tsv',
  filenameJson: 'nextclade.json',
  filenameTreeJson: 'nextclade.auspice.json',
  filenameFasta: 'nextclade.aligned.fasta',
  filenamePeptidesZip: 'nextclade.peptides.fasta.zip',
  filenameInsertionsCsv: 'nextclade.insertions.csv',
  filenameErrorsCsv: 'nextclade.errors.csv',
  filenamePeptidesTemplate: 'nextclade.peptide.{{GENE}}.fasta',
}

export const algorithmDefaultState: AlgorithmState = {
  status: AlgorithmGlobalStatus.idle,
  params: {
    datasets: [],
    defaultDatasetName: undefined,
    datasetCurrent: undefined,
    urlParams: {},
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
  },
  isDirty: true,
  results: [],
  resultsFiltered: [],
  treeStr: undefined,
  cladeNodeAttrKeys: [],
  errors: [],
  filters: {
    showGood: true,
    showMediocre: true,
    showBad: true,
    showErrors: true,
  },
  exportParams: DEFAULT_EXPORT_PARAMS,
}
