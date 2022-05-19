import { intersectionWith } from 'lodash'

import { AMINOACID_GAP } from 'src/constants'
import { parseAminoacidChange } from 'src/helpers/parseAminoacidChange'
import { notUndefined } from 'src/helpers/notUndefined'
import type { AminoacidSubstitution, NextcladeResult } from 'src/algorithms/types'
import { splitFilterString } from './splitFilterString'

export function aminoacidChangesAreEqual(filter: Partial<AminoacidSubstitution>, actual: AminoacidSubstitution) {
  const geneMatch = filter.gene === undefined || filter.gene.toLowerCase() === actual.gene.toLowerCase()
  const posMatch = filter.codon === undefined || filter.codon === actual.codon
  const refNucMatch =
    filter.refAA === undefined || (filter.refAA as string).toLowerCase() === (actual.refAA as string).toLowerCase()
  const queryNucMatch =
    filter.queryAA === undefined ||
    (filter.queryAA as string).toLowerCase() === (actual.queryAA as string).toLowerCase()
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
    const aaDeletionsLikeSubstitutions = aaDeletions.map((del) => ({ ...del, queryAa: AMINOACID_GAP }))

    // We want to search for both, the substitutions and deletions
    const aaChanges = [...aaSubstitutions, ...aaDeletionsLikeSubstitutions]

    return intersectionWith(aaFilters, aaChanges, aminoacidChangesAreEqual).length > 0
  }
}
