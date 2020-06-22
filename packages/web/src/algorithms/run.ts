import { pickBy } from 'lodash'
import { SARSCOV2 } from './SARS-CoV-2_parameters'
import type { AnalysisParams, AnalysisResult } from './types'

import { geneMap } from './geneMap'
import { parseSequences } from './parseSequences'
import { isSequenceInClade } from './isSequenceInClade'
import { sequenceQC } from './sequenceQC'
import { alignPairwise } from './alignPairwise'
import { analyzeSeq } from './analyzeSeq'
import { findCharacterRanges } from './findCharacterRanges'
import { getAllAminoAcidChanges } from './getAllAminoAcidChanges'

export function parse(input: string) {
  return parseSequences(input)
}

export function analyze({ seqName, seq, rootSeq }: AnalysisParams): AnalysisResult {
  const { alignmentScore, query, ref } = alignPairwise(seq, rootSeq)

  const alignedQuery = query.join('')

  const { mutations, insertions, deletions, alnStart, alnEnd } = analyzeSeq(query, ref)

  const clades = pickBy(SARSCOV2.clades, (clade) => isSequenceInClade(clade, mutations, rootSeq))

  const invalid = findCharacterRanges(alignedQuery, 'N')

  const aminoacidSubstitutions = getAllAminoAcidChanges(mutations, rootSeq, geneMap)

  const diagnostics = sequenceQC(mutations, insertions, deletions, alignedQuery)

  return Object.freeze({
    seqName,
    clades,
    invalid,
    mutations,
    aminoacidSubstitutions,
    insertions,
    deletions,
    alnStart,
    alnEnd,
    alignmentScore,
    alignedQuery,
    diagnostics,
  })
}
