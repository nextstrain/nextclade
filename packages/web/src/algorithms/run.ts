import { pickBy } from 'lodash'
import { SARSCOV2 } from './SARS-CoV-2_parameters'
import { AnalysisParams } from './types'

import { geneMap } from './geneMap'
import { parseSequences } from './parseSequences'
import { isSequenceInClade } from './isSequenceInClade'
import { sequenceQC } from './sequenceQC'
import { analyzeSeq } from './analyzeSeq'
import { findCharacterRanges } from './findCharacterRanges'
import { getAllAminoAcidChanges } from './getAllAminoAcidChanges'

export function parse(input: string) {
  return parseSequences(input)
}

export function analyze({ seqName, seq, rootSeq }: AnalysisParams) {
  const { mutations, insertions, deletions, alnStart, alnEnd, alignmentScore, alignedQuery } = analyzeSeq(seq, rootSeq)

  const clades = pickBy(SARSCOV2.clades, (clade) => isSequenceInClade(clade, mutations, rootSeq))

  const invalid = findCharacterRanges(alignedQuery, 'N')

  const aminoacidSubstitutions = getAllAminoAcidChanges(mutations, rootSeq, geneMap)

  const diagnostics = sequenceQC(mutations, insertions, deletions, alignedQuery)

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
