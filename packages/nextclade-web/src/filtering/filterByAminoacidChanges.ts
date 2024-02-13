import { intersectionWith, isNil } from 'lodash'

import { AMINOACID_GAP } from 'src/constants'
import { parseAminoacidChange } from 'src/helpers/parseAminoacidChange'
import { notUndefined } from 'src/helpers/notUndefined'
import type { AaSub, NextcladeResult } from 'src/types'
import { splitFilterString } from './splitFilterString'

export function aminoacidChangesAreEqual(actual: AaSub, filter: Partial<AaSub>) {
  const geneMatch = isNil(filter.cdsName) || (filter.cdsName ?? '').toLowerCase() === actual.cdsName.toLowerCase()
  const posMatch = isNil(filter.pos) || (filter.pos ?? -1) === actual.pos
  const refNucMatch = isNil(filter.refAa) || (filter.refAa ?? '').toLowerCase() === (actual.refAa ?? '').toLowerCase()
  const queryNucMatch = isNil(filter.qryAa) || (filter.qryAa ?? '').toLowerCase() === (actual.qryAa ?? '').toLowerCase()
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
    const aaDeletionsLikeSubstitutions: AaSub[] = aaDeletions.map((del) => ({
      ...del,
      qryAa: AMINOACID_GAP,
    }))

    // We want to search for both, the substitutions and deletions
    const aaChanges = [...aaSubstitutions, ...aaDeletionsLikeSubstitutions]

    return intersectionWith(aaChanges, aaFilters, aminoacidChangesAreEqual).length > 0
  }
}
