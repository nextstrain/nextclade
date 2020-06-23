import { DeepReadonly } from 'ts-essentials'
import type { Tagged } from 'src/helpers/types'

export type Nucleotide = Tagged<string, 'Nucleotide'>
export type Aminoacid = Tagged<string, 'Aminoacid'>

export interface NucleotideLocation {
  pos: number
  allele: string
}

export interface NucleotideDeletion {
  start: number
  length: number
}

export interface Substitutions {
  [key: string]: DeepReadonly<NucleotideLocation>[]
}

export interface AminoacidSubstitution {
  refAA: Aminoacid
  queryAA: Aminoacid
  codon: number
}

export interface AminoacidSubstitutions {
  pos: number
  allele: string
  substitutions: AminoacidSubstitution[]
}

export interface SubstringRange {
  begin: number
  end: number
}

export interface SubstringMatch {
  character: string
  range: SubstringRange
}

export interface QCParameters {
  knownClusters: Set<number>
  windowSize: number
  clusterCutOff: number
  divergenceThreshold: number
  mixedSitesThreshold: number
  missingDataThreshold: number
}

export interface VirusParams {
  QCParams: QCParameters
  clades: DeepReadonly<Substitutions>
}

export interface AlgorithmParams {
  rootSeq: string
  input: string
}

export interface AnalyzeSeqResult {
  substitutions: NucleotideLocation[]
  insertions: NucleotideLocation[]
  deletions: NucleotideDeletion[]
  alignmentStart: number
  alignmentEnd: number
}

export interface ClusteredSNPs {
  start: number
  end: number
  numberOfSNPs: number
}

export interface QCDiagnostics {
  totalNumberOfMutations: number
  totalMixedSites: number
  clusteredSNPs: ClusteredSNPs[]
}

export interface QCResult {
  flags: string[]
  diagnostics: QCDiagnostics
  nucleotideComposition: Record<string, number>
}

export interface AnalysisResult extends DeepReadonly<AnalyzeSeqResult> {
  seqName: string
  clades: DeepReadonly<Substitutions>
  missing: DeepReadonly<SubstringMatch[]>
  aminoacidSubstitutions: DeepReadonly<AminoacidSubstitutions[]>
  diagnostics: DeepReadonly<QCResult>
  alignmentScore: number
}

export interface AnalysisParams {
  seqName: string
  seq: string
  rootSeq: string
}

export interface GeneMapDatum {
  name: string
  color: string
  type: string
  start: number
  end: number
  seqid: string
  strand: string
}

export interface MutationElement extends NucleotideLocation {
  seqName: string
}

export interface MutationElementWithId extends MutationElement {
  id: string
}

export interface MissingElement {
  seqName: string
  character: string
  begin: number
  end: number
}

export interface MissingElementWithId extends MissingElement {
  id: string
}
