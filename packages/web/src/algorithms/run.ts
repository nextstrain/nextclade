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
import { AminoacidSubstitution, getAllAminoAcidChanges } from './getAllAminoAcidChanges'

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
}

export interface AnalysisResult extends Readonly<AnalyzeSeqResult> {
  seqName: string
  clades: DeepReadonly<Substitutions>
  invalid: DeepReadonly<SubstringMatch[]>
  aminoacidSubstitutions: DeepReadonly<AminoacidSubstitution[]>
  diagnostics: any
}

export interface AlgorithmResult {
  result: DeepReadonly<AnalysisResult[]>
}

export async function run({ input, rootSeq }: AlgorithmParams): Promise<AlgorithmResult> {
  const lines = input.split('\n')
  const parsedSequences = parseSequences(lines)

  const result = Object.entries(parsedSequences)
    .map(([seqName, seq]) => {
      const { mutations, insertions, deletions, alnStart, alnEnd } = analyzeSeq(seq, rootSeq)

      const clades = pickBy(CLADES, (clade) => isSequenceInClade(clade, mutations, rootSeq))

      const invalid = findCharacterRanges(seq, 'N-')

      const aminoacidSubstitutions = getAllAminoAcidChanges(mutations, rootSeq, geneMap)

      const diagnostics = sequenceQC(mutations, insertions, deletions)

      return {
        seqName,
        clades,
        invalid,
        mutations,
        insertions,
        deletions,
        alnStart,
        alnEnd,
        aminoacidSubstitutions,
        diagnostics,
      }
    })
    .filter(({ clades }) => Object.keys(clades).length !== 0)

  return { result }
}
