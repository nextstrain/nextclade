import { intersectionWith } from 'lodash'

import { parseAminoacidChange } from 'src/helpers/parseAminoacidChange'
import { notUndefined } from 'src/helpers/notUndefined'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import type { AminoacidSubstitution } from 'src/algorithms/types'

import { splitFilterString } from './splitFilterString'

export function aminoacidChangesAreEqual(filter: Partial<AminoacidSubstitution>, actual: AminoacidSubstitution) {
  const geneMatch = filter.gene === undefined || filter.gene === actual.gene
  const posMatch = filter.codon === undefined || filter.codon === actual.codon
  const refNucMatch = filter.refAA === undefined || (filter.refAA as string) === (actual.refAA as string)
  const queryNucMatch = filter.queryAA === undefined || (filter.queryAA as string) === (actual.queryAA as string)
  return geneMatch && posMatch && refNucMatch && queryNucMatch
}

export function filterByAminoacidChanges(aaFilter: string) {
  const aaFilters = splitFilterString(aaFilter).map(parseAminoacidChange).filter(notUndefined)

  return (result: SequenceAnalysisState) => {
    if (!result?.result) {
      return false
    }
    const { aminoacidChanges } = result.result
    return intersectionWith(aaFilters, aminoacidChanges, aminoacidChangesAreEqual).length > 0
  }
}
