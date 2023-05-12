import { isEqual, isNil, sumBy } from 'lodash'
import type {
  Aa,
  AaChange,
  AaChangeGroup,
  AaDel,
  AaIns,
  AaSub,
  Cds,
  CdsSegment,
  Dataset,
  DatasetFileUrls,
  DatasetsIndexJson,
  DatasetTagJson,
  FastaRecord,
  InsertionFor_Nuc, // eslint-disable-line camelcase
  NextcladeErrorOutputs,
  NextcladeOutputs,
  Nuc,
  NucDel,
  NucSub,
  NucSubFull,
  NucSubLabeled,
  PrivateNucMutations,
  Translation,
} from 'src/gen/_SchemaRoot'
import { StrictOmit } from 'ts-essentials'

export * from 'src/gen/_SchemaRoot'

export interface QCFilters {
  showGood: boolean
  showMediocre: boolean
  showBad: boolean
  showErrors: boolean
}

export type Nucleotide = Nuc
export type Aminoacid = Aa
export type AnalysisResult = NextcladeOutputs
export type PrivateMutations = PrivateNucMutations
export type NucleotideSubstitutionSimple = NucSub
export type NucleotideSubstitutionSimpleLabeled = NucSubLabeled
export type NucleotideSubstitution = NucSubFull
export type NucleotideDeletion = NucDel
// export type NucleotideDeletionSimple = NucDelMinimal
// export type NucleotideDeletionSimpleLabeled = NucDelFull
export type NucleotideInsertion = InsertionFor_Nuc // eslint-disable-line camelcase
export type NucleotideMissing = Range
export type AminoacidSubstitution = AaSub
export type AminoacidDeletion = AaDel
export type AminoacidInsertion = AaIns
export type AminoacidChange = AaChange
export type AminoacidChangesGroup = AaChangeGroup
// export type AaMotifDesc = AaMotif
export type AnalysisError = NextcladeErrorOutputs
export type FastaRecordId = StrictOmit<FastaRecord, 'seq'>
export type DatasetsIndexV2Json = DatasetsIndexJson
export type DatasetTag = DatasetTagJson
export type DatasetFiles = DatasetFileUrls

export function convertSimpleSubToSub({ refNuc, pos, queryNuc }: NucleotideSubstitutionSimple): NucleotideSubstitution {
  return {
    refNuc,
    pos,
    queryNuc,
    aaDeletions: [],
    aaSubstitutions: [],
  }
}

export function convertPrivateMutations(privateNucMutations: PrivateMutations) {
  const { reversionSubstitutions, labeledSubstitutions, unlabeledSubstitutions } = privateNucMutations

  // NOTE: Convert NucleotideDeletionSimple to NucleotideSubstitutionSimple,
  // and then everything to NucleotideSubstitutions, so that it's easier to render badge components.
  const reversions = reversionSubstitutions.map(convertSimpleSubToSub)

  const labeled = labeledSubstitutions

  // NOTE: we ignore unlabeled deletions. There are too many of them
  // TODO: consider converting deletions to ranges, as in the "Gap" column.
  const unlabeled = unlabeledSubstitutions.map(convertSimpleSubToSub)

  const totalMutations = reversions.length + labeled.length + unlabeled.length

  return { reversions, labeled, unlabeled, totalMutations }
}

export function cdsNucLength(cds: Cds) {
  return sumBy(cds.segments, cdsSegmentNucLength)
}

export function cdsCodonLength(cds: Cds) {
  return cdsNucLength(cds) / 3
}

export function cdsSegmentNucLength(cdsSeg: CdsSegment) {
  return cdsSeg.end - cdsSeg.start
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
  queryPeptides: Translation[]
  analysisResult: AnalysisResult
}

export function areDatasetsEqual(left?: Dataset, right?: Dataset): boolean {
  return !isNil(left) && !isNil(right) && isEqual(left.attributes, right.attributes)
}
