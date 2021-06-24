import type { Virus, AnalysisResult, Gene, Peptide, Warnings } from 'src/algorithms/types'
import type { Sorting } from 'src/helpers/sortResults'
import type { QCFilters } from 'src/filtering/filterByQCIssues'
import { getVirus } from 'src/algorithms/defaults/viruses'

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
  virus: Virus
}

export interface AlgorithmState {
  status: AlgorithmGlobalStatus
  params: AlgorithmParams
  isDirty: boolean
  results: SequenceAnalysisState[]
  resultsFiltered: SequenceAnalysisState[]
  treeStr?: string
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
  treeStr: undefined,
  errors: [],
  filters: {
    showGood: true,
    showMediocre: true,
    showBad: true,
    showErrors: true,
  },
  exportParams: DEFAULT_EXPORT_PARAMS,
}
