import { readFile } from 'src/helpers/readFile'

import { VIRUSES } from './viruses'
import { geneMap } from './geneMap'

import type { AminoacidSubstitution, AnalysisParams, AnalysisResultWithoutClade, ParseResult } from './types'
import { parseSequences } from './parseSequences'
import { alignPairwise } from './alignPairwise'
import { analyzeSeq } from './analyzeSeq'
import { findNucleotideRanges } from './findNucleotideRanges'
import { getAllAminoAcidChanges } from './getAllAminoAcidChanges'
import { GOOD_NUCLEOTIDES, N } from './nucleotides'
import { getNucleotideComposition } from './getNucleotideComposition'

export async function parse(input: string | File): Promise<ParseResult> {
  let newInput: string
  if (typeof input === 'string') {
    newInput = input
  } else {
    newInput = await readFile(input)
  }
  return { input: newInput, parsedSequences: parseSequences(newInput) }
}

export function analyze({ seqName, seq, rootSeq }: AnalysisParams): AnalysisResultWithoutClade {
  const virus = VIRUSES['SARS-CoV-2']

  if (seq.length < virus.minimalLength) {
    throw new Error(`sequence is too short for reliable alignment and QC analysis`)
  }

  const { alignmentScore, query, ref } = alignPairwise(seq, rootSeq)

  const alignedQuery = query.join('')

  const analyzeSeqResult = analyzeSeq(query, ref)
  const { substitutions: nucSubstitutions, insertions, deletions, alignmentStart, alignmentEnd } = analyzeSeqResult
  const totalMutations = nucSubstitutions.length
  const totalGaps = deletions.reduce((total, { length }) => total + length, 0)
  const totalInsertions = insertions.reduce((total, { ins }) => total + ins.length, 0)

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

  return Object.freeze({
    seqName,
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
    alignedQuery,
    nucleotideComposition,
  })
}
