/* eslint-disable @typescript-eslint/no-empty-interface */
import type { Tagged } from 'src/helpers/types'
import type { QCFilters } from 'src/filtering/filterByQCIssues'
import { isEqual, isNil } from 'lodash'

/** Type-safe representation of a nucleotide */
export type Nucleotide = Tagged<string, 'Nucleotide'>

/** Type-safe representation of an aminoacid */
export type Aminoacid = Tagged<string, 'Aminoacid'>

/** Represents a numeric interval bounded by begin and end. Similar to `Span`, but different representation. */
export interface Range {
  begin: number
  end: number
}

/** Represents a numeric interval bounded by start and length. Similar to `Range`, but different representation. */
export interface Span {
  start: number
  length: number
}

export interface NucleotideLocation {
  pos: number
  nuc: Nucleotide
}

export interface NucleotideSubstitution {
  pos: number
  refNuc: Nucleotide
  queryNuc: Nucleotide
  pcrPrimersChanged: PcrPrimer[]
  aaSubstitutions: AminoacidSubstitution[]
  aaDeletions: AminoacidDeletion[]
}

export interface NucleotideDeletion extends Span {
  aaSubstitutions: AminoacidSubstitution[]
  aaDeletions: AminoacidDeletion[]
}

export interface NucleotideInsertion {
  pos: number
  ins: string
}

export interface AminoacidInsertion {
  gene: string
  pos: number
  ins: string
}

export interface NucleotideMissing extends Range {}

export interface CharacterRange<Letter> extends Range {
  character: Letter
}

export type NucleotideRange = CharacterRange<Nucleotide>
export type AminoacidRange = CharacterRange<Aminoacid>

export interface GeneAminoacidRange {
  geneName: string
  character: Aminoacid
  ranges: AminoacidRange[]
  length: number
}

export type Clades = Record<string, NucleotideLocation[]>

export interface CladesGrouped {
  pos: number
  subs: Record<string, string[]>
}

export interface AminoacidSubstitution {
  refAA: Aminoacid
  codon: number
  queryAA: Aminoacid
  gene: string
  codonNucRange: Range
  refContext: string
  queryContext: string
  contextNucRange: Range
  nucSubstitutions: NucleotideSubstitution[]
  nucDeletions: NucleotideDeletion[]
}

export interface AminoacidDeletion {
  gene: string
  refAA: Aminoacid
  codon: number
  codonNucRange: Range
  refContext: string
  queryContext: string
  contextNucRange: Range
  nucSubstitutions: NucleotideSubstitution[]
  nucDeletions: NucleotideDeletion[]
}

export interface AminoacidChange extends AminoacidSubstitution {
  type: 'substitution' | 'deletion'
}

export interface AminoacidChangesGroup {
  gene: string
  codonAaRange: Range
  codonNucRange: Range
  changes: AminoacidChange[]
  nucSubstitutions: NucleotideSubstitution[]
  nucDeletions: NucleotideDeletion[]
  refContext: string
  queryContext: string
  contextNucRange: Range
  numSubstitutions: number
  numDeletions: number
}

export interface PcrPrimer {
  name: string
  target: string
  source: string
  rootOligonuc: string
  primerOligonuc: string
  range: Range
  nonACGTs: NucleotideLocation[]
}

export interface PcrPrimerChange {
  primer: PcrPrimer
  substitutions: NucleotideSubstitution[]
}

export interface QCRulesConfigMissingData {
  enabled: boolean
  missingDataThreshold: number
  scoreBias: number
}

export interface QCRulesConfigMixedSites {
  enabled: boolean
  mixedSitesThreshold: number
}

export interface QCRulesConfigPrivateMutations {
  enabled: boolean
  typical: number
  cutoff: number
}

export interface QCRulesConfigSnpClusters {
  enabled: boolean
  windowSize: number
  clusterCutOff: number
  scoreWeight: number
}

export interface QCRulesConfigFrameShifts {
  enabled: boolean
}

export interface QCRulesConfigStopCodons {
  enabled: boolean
}

export interface QcConfig {
  schemaVersion: string
  missingData: QCRulesConfigMissingData
  mixedSites: QCRulesConfigMixedSites
  privateMutations: QCRulesConfigPrivateMutations
  snpClusters: QCRulesConfigSnpClusters
  frameShifts: QCRulesConfigFrameShifts
  stopCodons: QCRulesConfigStopCodons
}

export interface ClusteredSNPs {
  start: number
  end: number
  numberOfSNPs: number
}

export enum QcStatus {
  good = 'good',
  mediocre = 'mediocre',
  bad = 'bad',
}

export interface QcResultMixedSites {
  score: number
  status: QcStatus
  totalMixedSites: number
  mixedSitesThreshold: number
}

export interface ClusteredSnp {
  start: number
  end: number
  numberOfSNPs: number
}

export interface QcResultSnpClusters {
  score: number
  status: QcStatus
  totalSNPs: number
  clusteredSNPs: ClusteredSnp[]
}

export interface QcResultMissingData {
  score: number
  status: QcStatus
  totalMissing: number
  missingDataThreshold: number
}

export interface QcResultPrivateMutations {
  score: number
  status: QcStatus
  numReversionSubstitutions: number
  numLabeledSubstitutions: number
  numUnlabeledSubstitutions: number
  totalDeletionRanges: number
  weightedTotal: number
  excess: number
  cutoff: number
}

export interface FrameShiftContext {
  codon: Range
}

export interface FrameShift {
  geneName: string
  nucRel: Range
  nucAbs: Range
  codon: Range
  gapsLeading: FrameShiftContext
  gapsTrailing: FrameShiftContext
}

export interface QcResultFrameShifts {
  score: number
  status: QcStatus
  frameShifts: FrameShift[]
  totalFrameShifts: number
  frameShiftsIgnored: FrameShift[]
  totalFrameShiftsIgnored: number
}

export interface StopCodonLocation {
  geneName: string
  codon: number
}

export interface QcResultStopCodons {
  score: number
  status: QcStatus
  stopCodons: StopCodonLocation[]
  totalStopCodons: number
  stopCodonsIgnored: StopCodonLocation[]
  totalStopCodonsIgnored: number
}

export interface QcResult {
  missingData?: QcResultMissingData
  mixedSites?: QcResultMixedSites
  privateMutations?: QcResultPrivateMutations
  snpClusters?: QcResultSnpClusters
  frameShifts?: QcResultFrameShifts
  stopCodons?: QcResultStopCodons
  overallScore: number
  overallStatus: QcStatus
}

export interface NucleotideSubstitutionSimple {
  refNuc: string
  pos: number
  queryNuc: string
}

export interface NucleotideDeletionSimple {
  refNuc: string
  pos: number
}

export interface NucleotideSubstitutionSimpleLabeled {
  substitution: NucleotideSubstitutionSimple
  labels: string[]
}

export interface NucleotideDeletionSimpleLabeled {
  deletion: NucleotideDeletionSimple
  labels: string[]
}

export interface PrivateMutations {
  privateSubstitutions: NucleotideSubstitutionSimple[]
  privateDeletions: NucleotideDeletionSimple[]
  reversionSubstitutions: NucleotideSubstitutionSimple[]
  labeledSubstitutions: NucleotideSubstitutionSimpleLabeled[]
  unlabeledSubstitutions: NucleotideSubstitutionSimple[]
}

export function convertDelToSub(del: NucleotideDeletionSimple): NucleotideSubstitutionSimple {
  return { ...del, queryNuc: '-' }
}

export function convertDelToSubLabeled(labeled: NucleotideDeletionSimpleLabeled): NucleotideSubstitutionSimpleLabeled {
  return { ...labeled, substitution: convertDelToSub(labeled.deletion) }
}

export function convertSimpleSubToSub({ refNuc, pos, queryNuc }: NucleotideSubstitutionSimple): NucleotideSubstitution {
  return {
    refNuc: refNuc as Nucleotide,
    pos,
    queryNuc: queryNuc as Nucleotide,
    aaDeletions: [],
    aaSubstitutions: [],
    pcrPrimersChanged: [],
  }
}

export interface PrivateMutationsInternal {
  reversions: NucleotideSubstitution[]
  labeled: NucleotideSubstitutionSimpleLabeled[]
  unlabeled: NucleotideSubstitution[]
  totalMutations: number
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

export interface PhenotypeValue {
  name: string
  gene: string
  value: number
}

export interface AaMotif {
  name: string
  gene: string
  position: number
  seq: string
}

export interface AaMotifMutation {
  name: string
  gene: string
  position: number
  refSeq: string
  qrySeq: string
}

export interface AaMotifChanges {
  preserved: AaMotifMutation[]
  gained: AaMotifMutation[]
  lost: AaMotifMutation[]
  ambiguous: AaMotifMutation[]
  total: number
}

export interface AnalysisResult {
  index: number
  seqName: string
  substitutions: NucleotideSubstitution[]
  totalSubstitutions: number
  insertions: NucleotideInsertion[]
  totalInsertions: number
  deletions: NucleotideDeletion[]
  totalDeletions: number
  frameShifts: FrameShift[]
  totalFrameShifts: number
  missing: NucleotideMissing[]
  totalMissing: number
  nonACGTNs: NucleotideRange[]
  totalNonACGTNs: number
  aaSubstitutions: AminoacidSubstitution[]
  totalAminoacidSubstitutions: number
  aaDeletions: AminoacidDeletion[]
  totalAminoacidDeletions: number
  aaInsertions: AminoacidInsertion[]
  totalAminoacidInsertions: number
  unknownAaRanges: GeneAminoacidRange[]
  totalUnknownAa: number
  aaChangesGroups: AminoacidChangesGroup[]
  alignmentStart: number
  alignmentEnd: number
  alignmentScore: number
  aaAlignmentRanges: Record<string, Range>
  alignedQuery: string
  nucleotideComposition: Record<string, number>
  pcrPrimerChanges: PcrPrimerChange[]
  totalPcrPrimerChanges: number
  clade: string
  privateNucMutations: PrivateMutations
  privateAaMutations: Record<string, PrivateMutations>
  coverage: number
  phenotypeValues?: PhenotypeValue[]
  qc: QcResult
  customNodeAttributes: Record<string, string>
  warnings: PeptideWarning[]
  missingGenes: string[]
  aaMotifs: Record<string, AaMotif[]>
  aaMotifsChanges: Record<string, AaMotifChanges>
}

export interface AnalysisError {
  index: number
  seqName: string
  errors: string[]
}

export interface ErrorsFromWeb {
  seqName: string
  errors: string
  warnings: PeptideWarning[]
  failedGenes: string[]
}

export interface Translation {
  geneName: string
  seq: string
  insertions: AminoacidInsertion[]
  frameShifts: FrameShift[]
  alignmentRange: Range
}

/** Represents a named interval in the genome */
export interface Gene {
  geneName: string
  color: string
  start: number
  end: number
  frame: number
  strand: string
}

export function geneLength(gene: Gene) {
  return gene.end - gene.start
}

export interface FastaRecordId {
  seqName: string
  index: number
}

export interface FastaRecord extends FastaRecordId {
  seq: string
}

export interface PeptideWarning {
  geneName: string
  warning: string
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

export interface UrlParams {
  inputRootSeq?: string
  inputTree?: string
  inputPcrPrimers?: string
  inputQcConfig?: string
  inputVirusJson?: string
  inputGeneMap?: string
}

export interface AnalysisOutput {
  query: string
  queryPeptides: Translation[]
  analysisResult: AnalysisResult
}

export interface NextcladeResult {
  index: number
  seqName: string
  result?: AnalysisOutput
  error?: string
}

export interface DatasetFiles {
  'genemap.gff': string
  'primers.csv': string
  'qc.json': string
  'reference.fasta': string
  'sequences.fasta': string
  'tag.json': string
  'tree.json': string
  'virus_properties.json': string

  [k: string]: string
}

export interface DatasetAttribute {
  value: string
  valueFriendly?: string
  isDefault: boolean
}

export interface DatasetAttributes {
  name: DatasetAttribute
  tag: DatasetAttribute
  reference: DatasetAttribute

  [k: string]: DatasetAttribute
}

export interface DatasetCompatibility {
  nextcladeCli: {
    min?: string
    max?: string
  }
  nextcladeWeb: {
    min?: string
    max?: string
  }
}

export interface DatasetParams {
  defaultGene?: string
  geneOrderPreference?: string[]
}

export interface DatasetTag {
  enabled?: boolean
  attributes?: Partial<DatasetAttributes>
  comment?: string
  compatibility?: DatasetCompatibility
  files?: DatasetFiles
  params?: DatasetParams
  zipBundle?: string
  metadata?: Record<string, unknown>
}

export interface Dataset {
  id: string
  enabled: boolean
  attributes: DatasetAttributes
  comment: string
  compatibility: DatasetCompatibility
  files: DatasetFiles
  params: DatasetParams
  zipBundle: string
}

export function areDatasetsEqual(left?: Dataset, right?: Dataset): boolean {
  return !isNil(left) && !isNil(right) && isEqual(left.attributes, right.attributes)
}

export interface DatasetsIndexV2Json {
  schema: string
  datasets: Dataset[]
}

export interface PhenotypeAttrDesc {
  name: string
  nameFriendly: string
  description: string
}

export interface AaMotifsDesc {
  name: string
  nameShort: string
  nameFriendly: string
  description: string
}
