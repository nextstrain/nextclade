import { pickBy } from 'lodash'

import { getGeneMap } from 'src/components/Main/getGeneMap' // FIXME
import type { Tagged } from 'src/helpers/types'

import { CLADES } from './clades'
import { parseSequences } from './parseSequences'
import { isSequenceInClade } from './isSequenceInClade'
import { sequenceQC } from './sequenceQC'
import { analyzeSeq } from './analyzeSeq'
import { findCharacterRanges, SubstringMatch } from './findCharacterRanges'
import { getAllAminoAcidChanges } from './getAllAminoAcidChanges'

export interface AlgorithmParams {
  rootSeq: string
  input: string
}

export interface Substitution {
  pos: number
  allele: string
}

export interface Substitutions {
  [key: string]: Substitution[]
}

export type Base = Tagged<string, 'Base'>

export interface AnalyzeSeqResult {
  seqName: string
  clades: Substitutions
  invalid: SubstringMatch[]
  mutations: Record<number, Base>
  insertions: Record<number, Base>
  deletions: Record<number, Base>
  alnStart: number
  alnEnd: number
}

export interface AlgorithmResult {
  result: AnalyzeSeqResult[]
}

export async function run({ input, rootSeq }: AlgorithmParams): Promise<AlgorithmResult> {
  const lines = input.split('\n')
  const parsedSequences = parseSequences(lines)

  const result = Object.entries(parsedSequences)
    .map(([seqName, seq]) => {
      const { mutations, insertions, deletions, alnStart, alnEnd } = analyzeSeq(seq, rootSeq)
      const clades = pickBy(CLADES, (clade) => isSequenceInClade(clade, mutations, rootSeq))
      const invalid = findCharacterRanges(seq, 'N-')
      return { seqName, clades, invalid, mutations, insertions, deletions, alnStart, alnEnd }
    })
    .filter(({ clades }) => Object.keys(clades).length !== 0)

  const diagnostics = result.map(({ seqName, mutations, insertions, deletions }) => {
    return { seqName, metrics: sequenceQC(mutations, insertions, deletions) }
  })

  console.log({ diagnostics })

  // just for development:
  const geneMap = getGeneMap()
  result.forEach((seq) => {
    Object.keys(seq.mutations).forEach((d) => {
      console.log(d, getAllAminoAcidChanges(parseInt(d), seq.mutations[d], rootSeq, geneMap))
    })
  })

  return { result }
}
