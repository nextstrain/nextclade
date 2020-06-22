import { DeepReadonly } from 'ts-essentials'
import type { Tagged } from 'src/helpers/types'

export interface Substitution {
  pos: number
  allele: string
}

export interface Substitutions {
  [key: string]: DeepReadonly<Substitution>[]
}

export interface AminoacidSubstitution {
  refAA: string
  queryAA: string
  codon: number
}

export interface AminoacidSubstitutions {
  position: string
  allele: string
  substitutions: AminoacidSubstitution[]
}

export type Base = Tagged<string, 'Base'>

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
  substitutions: Record<string, Base>
  insertions: Record<string, Base>
  deletions: Record<string, number>
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
  invalid: DeepReadonly<SubstringMatch[]>
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
