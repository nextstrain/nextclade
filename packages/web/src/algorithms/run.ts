import { pickBy } from 'lodash'
import { SARSCOV2 } from './SARS-CoV-2_parameters'
import type { AnalysisParams } from './types'

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

export function analyze({ seqName, seq, rootSeq }: AnalysisParams) {
  const alignment = alignPairwise(seq, rootSeq)
  if (alignment === undefined) {
    return {
      seqName,
    }
  }

  const alignedQuery = alignment.query.join('')

  const { mutations, insertions, deletions, alnStart, alnEnd } = analyzeSeq(alignment.query, alignment.ref)

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
    alignmentScore: alignment.alignmentScore,
    alignedQuery,
    diagnostics,
  })
}
