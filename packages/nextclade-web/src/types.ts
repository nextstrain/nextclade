import { isNil, isNumber, isFinite, isString, range, sumBy, isBoolean, get } from 'lodash'
import { REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'
import type {
  Aa,
  AaSub,
  AnyType,
  Cds,
  CdsSegment,
  Dataset,
  DatasetsIndexJson,
  FastaRecord,
  InsertionFor_Nuc, // eslint-disable-line camelcase
  LetterRangeFor_AaAnd_Position, // eslint-disable-line camelcase
  LetterRangeFor_NucAnd_Position, // eslint-disable-line camelcase
  NextcladeErrorOutputs,
  NextcladeOutputs,
  NextcladeResult,
  Nuc,
  NucDel,
  NucSub,
  PrivateAaMutations,
  PrivateNucMutations,
  RangeFor_Position, // eslint-disable-line camelcase
} from 'src/gen/_SchemaRoot'
import { StrictOmit } from 'ts-essentials'

export * from 'src/gen/_SchemaRoot'

export type Range = RangeFor_Position // eslint-disable-line camelcase

export function rangeLen(range: Range) {
  return range.end - range.begin
}

export type Nucleotide = Nuc
export type Aminoacid = Aa
export type NucleotideRange = LetterRangeFor_NucAnd_Position // eslint-disable-line camelcase
export type AminoacidRange = LetterRangeFor_AaAnd_Position // eslint-disable-line camelcase
export type NucleotideInsertion = InsertionFor_Nuc // eslint-disable-line camelcase
export type NucleotideMissing = LetterRangeFor_NucAnd_Position // eslint-disable-line camelcase
export type AnalysisResult = NextcladeOutputs
export type AnalysisError = NextcladeErrorOutputs
export type FastaRecordId = StrictOmit<FastaRecord, 'seq'>
export type DatasetsIndexV2Json = DatasetsIndexJson

export function cdsNucLength(cds: Cds) {
  return sumBy(cds.segments, cdsSegmentNucLength)
}

export function cdsCodonLength(cds: Cds) {
  return cdsNucLength(cds) / 3
}

export function cdsSegmentNucLength(cdsSeg: CdsSegment) {
  return cdsSeg.range.end - cdsSeg.range.begin
}

export function cdsSegmentAaLength(cdsSeg: CdsSegment) {
  return (cdsSeg.rangeLocal.end - cdsSeg.rangeLocal.begin) / 3
}

export function iterRange(r: Range): number[] {
  return range(r.begin, r.end)
}

export function getNucMutations(
  analysisResult: AnalysisResult,
  refNodeName: string,
):
  | {
      subs: NucSub[]
      relMuts?: PrivateNucMutations
    }
  | undefined {
  if (refNodeName === REF_NODE_ROOT) {
    return { subs: analysisResult.substitutions, relMuts: undefined }
  }
  if (refNodeName === REF_NODE_PARENT) {
    return {
      subs: analysisResult.privateNucMutations.privateSubstitutions,
      relMuts: analysisResult.privateNucMutations,
    }
  }
  const relMuts = analysisResult.relativeNucMutations.find((relMuts) => relMuts.refNode.name === refNodeName)?.muts
  if (!relMuts) {
    return undefined
  }
  return {
    subs: relMuts.privateSubstitutions,
    relMuts,
  }
}

export function getAaMutations(
  analysisResult: AnalysisResult,
  refNodeName: string,
):
  | {
      aaSubs: AaSub[]
      relAaMuts?: PrivateAaMutations[]
    }
  | undefined {
  if (refNodeName === REF_NODE_ROOT) {
    return { aaSubs: analysisResult.aaSubstitutions, relAaMuts: undefined }
  }
  if (refNodeName === REF_NODE_PARENT) {
    const relAaMuts = Object.values(analysisResult.privateAaMutations).flat()
    const aaSubs = relAaMuts.flatMap((m) => m.privateSubstitutions)
    return { aaSubs, relAaMuts }
  }
  const muts = analysisResult.relativeAaMutations.find((relMuts) => relMuts.refNode.name === refNodeName)?.muts
  if (!muts) {
    return undefined
  }
  const relAaMuts = Object.values(muts).flat()
  const aaSubs = relAaMuts.flatMap((m) => m.privateSubstitutions)
  return { aaSubs, relAaMuts }
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
  uid: string
  path: string
  type: AlgorithmInputType
  name: string
  description: string

  getContent(): Promise<string>
}

export function areDatasetsEqual(left?: Dataset, right?: Dataset): boolean {
  return !isNil(left?.path) && !isNil(right?.path) && left?.path === right?.path
}

export function anyAsStrMaybe(x: AnyType | undefined): string | undefined {
  return isString(x) ? x : undefined
}

export function anyAsNumberMaybe(x: AnyType | undefined): number | undefined {
  return isNumber(x) && isFinite(x) ? x : undefined
}

export function anyAsBoolMaybe(x: AnyType | undefined): boolean | undefined {
  return isBoolean(x) ? x : undefined
}

export function attrStrMaybe(attributes: Record<string, AnyType> | undefined, name: string): string | undefined {
  return anyAsStrMaybe(get(attributes, name))
}

export function attrNumberMaybe(attributes: Record<string, AnyType> | undefined, name: string): number | undefined {
  return anyAsNumberMaybe(get(attributes, name))
}

export function attrBoolMaybe(attributes: Record<string, AnyType> | undefined, name: string): boolean | undefined {
  return anyAsBoolMaybe(get(attributes, name))
}

export function toSub(del: NucDel): NucSub {
  return { ...del, qryNuc: '-' }
}
