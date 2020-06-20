import { pickBy } from 'lodash'
import { DeepReadonly } from 'ts-essentials'

import type { Tagged } from 'src/helpers/types'

import { CLADES } from './clades'
import { geneMap } from './geneMap'
import { parseSequences } from './parseSequences'
import { isSequenceInClade } from './isSequenceInClade'
import { sequenceQC } from './sequenceQC'
import { analyzeSeq } from './analyzeSeq'
import { findCharacterRanges, SubstringMatch } from './findCharacterRanges'
import { getAllAminoAcidChanges, AminoacidSubstitutions } from './getAllAminoAcidChanges'

export interface AlgorithmParams {
  rootSeq: string
  input: string
}

export interface Substitution {
  pos: number
  allele: string
}

export interface Substitutions {
  [key: string]: DeepReadonly<Substitution>[]
}

export type Base = Tagged<string, 'Base'>

export interface AnalyzeSeqResult {
  mutations: Record<string, Base>
  insertions: Record<string, Base>
  deletions: Record<string, number>
  alnStart: number
  alnEnd: number
  alignmentScore: number
  alignedQuery: string
}

export interface ClusteredSNPs {
  start: number
  end: number
  numberOfSNPs: number
}

export interface QCDiagnostics {
  totalNumberOfMutations: number
  clusteredSNPs: ClusteredSNPs[]
}

export interface QCResult {
  flags: string[]
  diagnostics: QCDiagnostics
}

export interface AnalysisResult extends DeepReadonly<AnalyzeSeqResult> {
  seqName: string
  clades: DeepReadonly<Substitutions>
  invalid: DeepReadonly<SubstringMatch[]>
  aminoacidSubstitutions: DeepReadonly<AminoacidSubstitutions[]>
  diagnostics: DeepReadonly<QCResult>
}

export interface AlgorithmResult {
  result: DeepReadonly<AnalysisResult[]>
}

export function parse(input: string) {
  return parseSequences(input)
}

export interface AnalyzePrams {
  seqName: string
  seq: string
  rootSeq: string
}

export function analyze({ seqName, seq, rootSeq }: AnalyzePrams) {
  const { mutations, insertions, deletions, alnStart, alnEnd, alignmentScore, alignedQuery } = analyzeSeq(seq, rootSeq)

  const clades = pickBy(CLADES, (clade) => isSequenceInClade(clade, mutations, rootSeq))

  const invalid = findCharacterRanges(alignedQuery, 'N')

  const aminoacidSubstitutions = getAllAminoAcidChanges(mutations, rootSeq, geneMap)

  const diagnostics = sequenceQC(mutations, insertions, deletions)

  return Object.freeze({
    seqName,
    clades,
    invalid,
    mutations,
    insertions,
    deletions,
    alnStart,
    alnEnd,
    alignmentScore,
    alignedQuery,
    aminoacidSubstitutions,
    diagnostics,
  })
}
