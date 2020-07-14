import { pickBy } from 'lodash'

import { readFile } from 'src/helpers/readFile'

import { VIRUSES } from './viruses'
import { geneMap } from './geneMap'

import type { AminoacidSubstitution, AnalysisParams, AnalysisResult, ParseResult } from './types'
import { parseSequences } from './parseSequences'
import { isSequenceInClade } from './isSequenceInClade'
import { runQC } from './QC/runQC'
import { alignPairwise } from './alignPairwise'
import { analyzeSeq } from './analyzeSeq'
import { findNucleotideRanges } from './findNucleotideRanges'
import { getAllAminoAcidChanges } from './getAllAminoAcidChanges'
import { GOOD_NUCLEOTIDES, N } from './nucleotides'
import { getNucleotideComposition } from './getNucleotideComposition'

export async function parse(input: string | File): Promise<ParseResult> {
  if (typeof input !== 'string') {
    // eslint-disable-next-line no-param-reassign
    input = await readFile(input)
  }

  return { input, parsedSequences: parseSequences(input) }
}

export function analyze({ seqName, seq, rootSeq }: AnalysisParams): AnalysisResult {
  const virus = VIRUSES['SARS-CoV-2']

  const { alignmentScore, query, ref } = alignPairwise(seq, rootSeq)

  const alignedQuery = query.join('')

  const analyzeSeqResult = analyzeSeq(query, ref)
  const { substitutions: nucSubstitutions, insertions, deletions, alignmentStart, alignmentEnd } = analyzeSeqResult
  const totalMutations = nucSubstitutions.length
  const totalGaps = deletions.reduce((total, { length }) => total + length, 0)
  const totalInsertions = insertions.reduce((total, { ins }) => total + ins.length, 0)

  const clades = pickBy(virus.clades, (clade) => isSequenceInClade(clade, nucSubstitutions, rootSeq))

  const missing = findNucleotideRanges(alignedQuery, N)
  const totalMissing = missing.reduce((total, { begin, end }) => total + end - begin, 0)

  const nonACGTNs = findNucleotideRanges(alignedQuery, (nuc) => !GOOD_NUCLEOTIDES.includes(nuc))
  const totalNonACGTNs = nonACGTNs.reduce((total, { begin, end }) => total + end - begin, 0)

  const substitutions = getAllAminoAcidChanges(nucSubstitutions, rootSeq, geneMap)
  const aminoacidChanges = substitutions.reduce(
    (result, { aaSubstitutions }) => [...result, ...aaSubstitutions],
    [] as AminoacidSubstitution[],
  )
  const totalAminoacidChanges = aminoacidChanges.length

  const nucleotideComposition = getNucleotideComposition(alignedQuery)

  const diagnostics = runQC({ virus, substitutions, insertions, deletions, alignedQuery, nucleotideComposition })

  return Object.freeze({
    seqName,
    clades,
    substitutions,
    totalMutations,
    aminoacidChanges,
    totalAminoacidChanges,
    insertions,
    totalInsertions,
    deletions,
    totalGaps,
    missing,
    totalMissing,
    nonACGTNs,
    totalNonACGTNs,
    alignmentStart,
    alignmentEnd,
    alignmentScore,
    diagnostics,
  })
}
