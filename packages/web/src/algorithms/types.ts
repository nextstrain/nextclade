/* eslint-disable @typescript-eslint/no-empty-interface */
import type { Tagged } from 'src/helpers/types'

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
  ref: string
  pos: number
  qry: string
}

export interface NucleotideDeletionSimple {
  ref: string
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
  return { ...del, qry: '-' }
}

export function convertDelToSubLabeled(labeled: NucleotideDeletionSimpleLabeled): NucleotideSubstitutionSimpleLabeled {
  return { ...labeled, substitution: convertDelToSub(labeled.deletion) }
}

export function convertSimpleSubToSub({ ref, pos, qry }: NucleotideSubstitutionSimple): NucleotideSubstitution {
  return {
    refNuc: ref as Nucleotide,
    pos,
    queryNuc: qry as Nucleotide,
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

export interface AnalysisResult {
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
  alignmentStart: number
  alignmentEnd: number
  alignmentScore: number
  alignedQuery: string
  nucleotideComposition: Record<string, number>
  pcrPrimerChanges: PcrPrimerChange[]
  totalPcrPrimerChanges: number
  clade: string
  privateNucMutations: PrivateMutations
  privateAaMutations: Record<string, PrivateMutations>
  qc: QcResult
  customNodeAttributes: Record<string, string>
}

export interface Peptide {
  name: string
  seq: string
}

/** Represents a named interval in the genome */
export interface Gene {
  geneName: string
  color: string
  start: number
  end: number
  length: number
  frame: number
  strand: string
}

export interface SequenceParserResult {
  index: number
  seqName: string
  seq: string
}

export interface GeneWarning {
  geneName: string
  message: string
}

export interface Warnings {
  global: string[]
  inGenes: GeneWarning[]
}

export interface DatasetsSettings {
  defaultDatasetName: string
  defaultDatasetNameFriendly: string
}

export interface DatasetFiles {
  geneMap: string
  primers: string
  qc: string
  virusPropertiesJson: string
  reference: string
  sequences: string
  tree: string
  tag: string

  [k: string]: string
}

export interface DatasetVersion {
  enabled: boolean
  metadata: Record<string, unknown>
  tag: string
  comment: string
  latest: boolean
  compatibility: {
    nextcladeCli: {
      min?: string
      max?: string
    }
    nextcladeWeb: {
      min?: string
      max?: string
    }
  }
  files: DatasetFiles
  zipBundle: string
}

export interface DatasetRefSeq {
  accession: string
  source: string
  strainName: string
}

export interface DatasetRef {
  enabled: boolean
  metadata: Record<string, unknown>
  reference: DatasetRefSeq
  versions: DatasetVersion[]
}

export interface Dataset {
  enabled: boolean
  name: string
  nameFriendly: string
  datasetRefs: DatasetRef[]
  defaultRef: string
  defaultGene: string
  geneOrderPreference: string[]
}

export interface DatasetsIndexJson {
  settings: DatasetsSettings
  datasets: Dataset[]
}

export interface DatasetFlat extends Dataset, DatasetRef, DatasetVersion {}

export interface UrlParams {
  inputRootSeq?: string
  inputTree?: string
  inputPcrPrimers?: string
  inputQcConfig?: string
  inputVirusJson?: string
  inputGeneMap?: string
}
