import { isEqual, isNil, range, sumBy } from 'lodash'
import type {
  Aa,
  Cds,
  CdsSegment,
  Dataset,
  DatasetFileUrls,
  DatasetTagJson,
  DatasetsIndexJson,
  FastaRecord,
  InsertionFor_Nuc, // eslint-disable-line camelcase
  LetterRangeFor_AaAnd_Position, // eslint-disable-line camelcase
  LetterRangeFor_NucAnd_Position, // eslint-disable-line camelcase
  NextcladeErrorOutputs,
  NextcladeOutputs,
  Nuc,
  NucSub,
  NucSubLabeled,
  PrivateNucMutations,
  RangeFor_Position, // eslint-disable-line camelcase
  Translation,
} from 'src/gen/_SchemaRoot'
import { StrictOmit } from 'ts-essentials'

export * from 'src/gen/_SchemaRoot'

export type SetterOrUpdater<T> = (valOrUpdater: ((currVal: T) => T) | T) => void

export type Range = RangeFor_Position // eslint-disable-line camelcase

export function rangeLen(range: Range) {
  return range.end - range.begin
}

export function rangeIsEmpty(range: Range) {
  return rangeLen(range) === 0
}

export function rangeFixed(range: Range) {
  if (range.begin > range.end) {
    return { begin: range.end, end: range.end }
  }
  return range
}

export function rangeContains(range: Range, x: number) {
  return x >= range.begin && x < range.end
}

/// Compute an intersection of two ranges. Returns an empty range if the intersection is empty
export function rangeIntersect(x: Range, y: Range): Range {
  if (y.begin > x.end || x.begin > y.end) {
    return { begin: 0, end: 0 }
  }
  const begin = Math.max(x.begin, y.begin)
  const end = Math.min(x.end, y.end)
  return rangeFixed({ begin, end })
}

/// Compute an intersection of two ranges. Returns None if the intersection is empty
export function rangeIntersectOrNone(x: Range, y: Range): Range | undefined {
  const intersection = rangeIntersect(x, y)
  if (rangeIsEmpty(intersection)) {
    return undefined
  }
  return intersection
}

export type Nucleotide = Nuc
export type Aminoacid = Aa
export type NucleotideRange = LetterRangeFor_NucAnd_Position // eslint-disable-line camelcase
export type AminoacidRange = LetterRangeFor_AaAnd_Position // eslint-disable-line camelcase
export type AnalysisResult = NextcladeOutputs
export type NucleotideInsertion = InsertionFor_Nuc // eslint-disable-line camelcase
export type NucleotideMissing = LetterRangeFor_NucAnd_Position // eslint-disable-line camelcase
export type AnalysisError = NextcladeErrorOutputs
export type FastaRecordId = StrictOmit<FastaRecord, 'seq'>
export type DatasetsIndexV2Json = DatasetsIndexJson
export type DatasetTag = DatasetTagJson
export type DatasetFiles = DatasetFileUrls

export interface PrivateMutationsInternal {
  reversionSubstitutions: NucSub[]
  labeledSubstitutions: NucSubLabeled[]
  unlabeledSubstitutions: NucSub[]
  totalMutations: number
}

export function convertPrivateMutations(privateNucMutations: PrivateNucMutations): PrivateMutationsInternal {
  const { reversionSubstitutions, labeledSubstitutions, unlabeledSubstitutions } = privateNucMutations

  const totalMutations = reversionSubstitutions.length + labeledSubstitutions.length + unlabeledSubstitutions.length

  return {
    reversionSubstitutions,
    labeledSubstitutions,
    unlabeledSubstitutions,
    totalMutations,
  }
}

export function cdsNucLength(cds: Cds) {
  return sumBy(cds.segments, cdsSegmentNucLength)
}

export function cdsCodonLength(cds: Cds) {
  return cdsNucLength(cds) / 3
}

export function cdsSegmentNucLength(cdsSeg: CdsSegment) {
  return cdsSeg.range.end - cdsSeg.range.begin
}

export function iterRange(r: Range): number[] {
  return range(r.begin, r.end)
}

export interface QCFilters {
  showGood: boolean
  showMediocre: boolean
  showBad: boolean
  showErrors: boolean
}

export interface ResultsFilters extends QCFilters {
  seqNamesFilter?: string
  mutationsFilter?: string
  aaFilter?: string
  cladesFilter?: string
}

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

export function getResultStatus(result: NextcladeResult) {
  if (result.error) {
    return AlgorithmSequenceStatus.failed
  }
  if (result.result) {
    return AlgorithmSequenceStatus.done
  }
  return AlgorithmSequenceStatus.started
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

export interface NextcladeResult {
  index: number
  seqName: string
  result?: AnalysisOutput
  error?: string
}

export interface AnalysisOutput {
  query: string
  queryPeptides: Translation
  analysisResult: AnalysisResult
}

export function areDatasetsEqual(left?: Dataset, right?: Dataset): boolean {
  return !isNil(left) && !isNil(right) && isEqual(left.attributes, right.attributes)
}
