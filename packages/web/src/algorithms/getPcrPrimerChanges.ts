import { inRange } from 'lodash'

import type {
  SubstitutionsWithAminoacids,
  PcrPrimer,
  NucleotideSubstitution,
  PcrPrimerChange,
  SubstitutionsWithPrimers,
} from 'src/algorithms/types'
import { notUndefined } from 'src/helpers/notUndefined'

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
      const substitutions = nucSubstitutions.filter((mut) => inRange(mut.pos, primer.range.begin, primer.range.end))
      if (substitutions.length === 0) {
        return undefined
      }
      return { primer, substitutions }
    })
    .filter(notUndefined)
}

/**
 * Enrich array of substitutions with PCR primer changes.
 * Each substitution can have multiple changes.
 */
export function getSubstitutionsWithPcrPrimerChanges(
  substitutions: SubstitutionsWithAminoacids[],
  primers: PcrPrimer[],
): SubstitutionsWithPrimers[] {
  return substitutions.map((mut) => {
    const pcrPrimersChanged = primers.filter((primer) => inRange(mut.pos, primer.range.begin, primer.range.end))
    return { ...mut, pcrPrimersChanged }
  })
}
