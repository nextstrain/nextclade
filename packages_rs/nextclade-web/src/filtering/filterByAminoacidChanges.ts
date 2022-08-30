import { intersectionWith, isNil } from 'lodash'

import { AMINOACID_GAP } from 'src/constants'
import { parseAminoacidChange } from 'src/helpers/parseAminoacidChange'
import { notUndefined } from 'src/helpers/notUndefined'
import type { AminoacidSubstitution, NextcladeResult } from 'src/algorithms/types'
import { splitFilterString } from './splitFilterString'

export function aminoacidChangesAreEqual(actual: AminoacidSubstitution, filter: Partial<AminoacidSubstitution>) {
  const geneMatch = isNil(filter.gene) || (filter.gene ?? '').toLowerCase() === actual.gene.toLowerCase()
  const posMatch = isNil(filter.codon) || (filter.codon ?? -1) === actual.codon
  const refNucMatch = isNil(filter.refAA) || (filter.refAA ?? '').toLowerCase() === (actual.refAA ?? '').toLowerCase()
  const queryNucMatch =
    isNil(filter.queryAA) || (filter.queryAA ?? '').toLowerCase() === (actual.queryAA ?? '').toLowerCase()
  return geneMatch && posMatch && refNucMatch && queryNucMatch
}

export function filterByAminoacidChanges(aaFilter: string) {
  const aaFilters = splitFilterString(aaFilter).map(parseAminoacidChange).filter(notUndefined)

  return (result: NextcladeResult) => {
    if (!result?.result) {
      return false
    }
    const { aaSubstitutions, aaDeletions } = result.result.analysisResult

    // Make deletions look like substitutions
    const aaDeletionsLikeSubstitutions: AminoacidSubstitution[] = aaDeletions.map((del) => ({
      ...del,
      queryAA: AMINOACID_GAP,
    }))

    // We want to search for both, the substitutions and deletions
    const aaChanges = [...aaSubstitutions, ...aaDeletionsLikeSubstitutions]

    return intersectionWith(aaChanges, aaFilters, aminoacidChangesAreEqual).length > 0
  }
}
