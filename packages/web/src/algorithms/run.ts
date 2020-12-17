import { assignClade } from 'src/algorithms/assignClade'
import { runQC } from 'src/algorithms/QC/runQC'
import { treeFindNearestNodes } from 'src/algorithms/tree/treeFindNearestNodes'
import { readFile } from 'src/helpers/readFile'

import type { AnalysisResultWithMatch, AnalysisParams, ParseResult } from './types'
import { parseSequences } from './parseSequences'
import { alignPairwise } from './alignPairwise'
import { analyzeSeq } from './analyzeSeq'
import { findNucleotideRanges } from './findNucleotideRanges'
import { getAminoAcidChanges } from './getAminoAcidChanges'
import { GOOD_NUCLEOTIDES, N } from './nucleotides'
import { getNucleotideComposition } from './getNucleotideComposition'
import { getPcrPrimerChanges, getSubstitutionsWithPcrPrimerChanges } from './getPcrPrimerChanges'

export async function parse(input: string | File): Promise<ParseResult> {
  let newInput: string
  if (typeof input === 'string') {
    newInput = input
  } else {
    newInput = await readFile(input)
  }
  return { input: newInput, parsedSequences: parseSequences(newInput) }
}

export function analyze({
  seqName,
  seq,
  rootSeq,
  minimalLength,
  pcrPrimers,
  geneMap,
  auspiceData,
  qcRulesConfig,
}: AnalysisParams): AnalysisResultWithMatch {
  const { alignmentScore, query, ref } = alignPairwise(seq, rootSeq, minimalLength)

  const alignedQuery = query.join('')

  const analyzeSeqResult = analyzeSeq(query, ref)
  const {
    substitutions: nucSubstitutions,
    insertions,
    deletions: nucDeletions,
    alignmentStart,
    alignmentEnd,
  } = analyzeSeqResult
  const totalMutations = nucSubstitutions.length
  const totalGaps = nucDeletions.reduce((total, { length }) => total + length, 0)
  const totalInsertions = insertions.reduce((total, { ins }) => total + ins.length, 0)

  const missing = findNucleotideRanges(alignedQuery, N)
  const totalMissing = missing.reduce((total, { begin, end }) => total + end - begin, 0)

  const nonACGTNs = findNucleotideRanges(alignedQuery, (nuc) => !GOOD_NUCLEOTIDES.includes(nuc))
  const totalNonACGTNs = nonACGTNs.reduce((total, { begin, end }) => total + end - begin, 0)

  // prettier-ignore
  const { aaSubstitutions, aaDeletions, substitutionsWithAA, deletionsWithAA } =
    getAminoAcidChanges(nucSubstitutions, nucDeletions, rootSeq, geneMap)

  const totalAminoacidSubstitutions = aaSubstitutions.length
  const totalAminoacidDeletions = aaDeletions.length

  const nucleotideComposition = getNucleotideComposition(alignedQuery)

  const substitutions = getSubstitutionsWithPcrPrimerChanges(substitutionsWithAA, pcrPrimers)
  const pcrPrimerChanges = getPcrPrimerChanges(nucSubstitutions, pcrPrimers)
  const totalPcrPrimerChanges = pcrPrimerChanges.reduce((total, { substitutions }) => total + substitutions.length, 0)

  const deletions = deletionsWithAA

  const analysisResult = {
    seqName,
    substitutions,
    totalMutations,
    insertions,
    totalInsertions,
    deletions,
    totalGaps,
    missing,
    totalMissing,
    nonACGTNs,
    totalNonACGTNs,
    aaSubstitutions,
    totalAminoacidSubstitutions,
    aaDeletions,
    totalAminoacidDeletions,
    alignmentStart,
    alignmentEnd,
    alignmentScore,
    alignedQuery,
    nucleotideComposition,
    pcrPrimerChanges,
    totalPcrPrimerChanges,
  }

  const { match, privateMutations } = treeFindNearestNodes({ analysisResult, rootSeq, auspiceData })

  const { clade } = assignClade(analysisResult, match)
  const analysisResultWithClade = { ...analysisResult, clade }

  const qc = runQC({ analysisResult: analysisResultWithClade, privateMutations, qcRulesConfig })

  return { ...analysisResultWithClade, qc, nearestTreeNodeId: match.id }
}
