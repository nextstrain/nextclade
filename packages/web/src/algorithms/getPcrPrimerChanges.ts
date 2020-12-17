import { inRange } from 'lodash'

import type {
  PcrPrimer,
  NucleotideSubstitution,
  PcrPrimerChange,
  SubstitutionsWithPrimers,
  NucleotideSubstitutionWithAminoacids,
} from 'src/algorithms/types'
import { notUndefined } from 'src/helpers/notUndefined'
import { isMatch } from './nucleotideCodes'

/**
 * Decides whether a given mutation should be reported as mutation causing change in a given PCR primer
 */
export function shouldReportPrimerMutation(mut: NucleotideSubstitution, primer: PcrPrimer) {
  const inside = inRange(mut.pos, primer.range.begin, primer.range.end)

  // Don't report mutation if outside the primer range
  if (!inside) {
    return false
  }

  // Don't report mutation if primer contains matching ambiguous nucleotide at this position
  const allowed = primer.nonACGTs.some((nonACGT) => mut.pos === nonACGT.pos && isMatch(nonACGT.nuc, mut.queryNuc))

  // Report otherwise
  return !allowed
}

/**
 * Builds a list of primer changes due to mutations.
 * Each element contains a primer and a list of corresponding substitutions.
 */
export function getPcrPrimerChanges(
  nucSubstitutions: NucleotideSubstitution[],
  primers: PcrPrimer[],
): PcrPrimerChange[] {
  return primers
    .map((primer) => {
      const substitutions = nucSubstitutions.filter((mut) => shouldReportPrimerMutation(mut, primer))
      if (substitutions.length === 0) {
        return undefined
      }
      return { primer, substitutions }
    })
    .filter(notUndefined)
}

/**
 * Adds PCR primer changes to the array of substitutions.
 * Each substitution can have multiple PCR primer changes.
 */
export function getSubstitutionsWithPcrPrimerChanges(
  substitutions: NucleotideSubstitutionWithAminoacids[],
  primers: PcrPrimer[],
): SubstitutionsWithPrimers[] {
  return substitutions.map((mut) => {
    const pcrPrimersChanged = primers.filter((primer) => shouldReportPrimerMutation(mut, primer))
    return { ...mut, pcrPrimersChanged }
  })
}
