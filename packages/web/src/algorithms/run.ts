import { pickBy, zip, zipWith } from 'lodash'

import type { DeepPartial } from 'ts-essentials'
import { readFile } from 'src/helpers/readFile'

import type { AuspiceJsonV2, AuspiceTreeNode } from 'auspice'

import { VIRUSES } from './viruses'
import { geneMap } from './geneMap'

import { locateInTree, finalizeTree } from './tree/locateInTree'
import type { AminoacidSubstitution, AnalysisParams, AnalysisResult, ParseResult } from './types'
import { parseSequences } from './parseSequences'
import { isSequenceInClade } from './isSequenceInClade'
import { QCResult, QCRulesConfig, runQC } from './QC/runQC'
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

  const clades = pickBy(virus.clades, (clade) =>
    isSequenceInClade(clade, nucSubstitutions, alignmentStart, alignmentEnd, rootSeq),
  )

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
    alignedQuery,
    nucleotideComposition,
  })
}

export interface BuildTreeParams {
  analysisResults: AnalysisResult[]
  rootSeq: string
}

export interface BuildTreeResult {
  matches: AuspiceTreeNode[]
  auspiceData: AuspiceJsonV2
}

export function buildTree({ analysisResults, rootSeq }: BuildTreeParams): BuildTreeResult {
  return locateInTree(analysisResults, rootSeq)
}

// NOTE: this function is not used, but just gives an idea of how data would flow through the algorithm if it was not parallelized
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function runSerial(input: string | File, rootSeq: string, qcRulesConfig: DeepPartial<QCRulesConfig>) {
  const { parsedSequences } = await parse(input)

  // fork

  const analysisResults = Object.entries(parsedSequences).map(([seqName, seq]) => analyze({ seqName, seq, rootSeq }))

  // join

  const { matches, auspiceData } = locateInTree(analysisResults, rootSeq)

  // fork

  const qcResults = analysisResults.map((analysisResult) => runQC({ analysisResult, auspiceData, qcRulesConfig }))

  // join

  const tree = finalizeTree({ auspiceData, analysisResults, matches, qcResults, rootSeq })

  const results = zipWith(analysisResults, qcResults, (ar, qc) => ({ ...ar, qc }))

  return Object.freeze({ results, tree })
}
