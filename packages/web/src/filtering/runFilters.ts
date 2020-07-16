import type { DeepWritable } from 'ts-essentials'

import type { AlgorithmState } from 'src/state/algorithm/algorithm.state'

import { filterByAminoacidChanges } from './filterByAminoacidChanges'
import { filterByClades } from './filterByClades'
import { filterByNucleotideMutations } from './filterByNucleotideMutations'
import { filterByQCIssues } from './filterByQCIssues'
import { filterBySeqName } from './filterBySeqName'

export function runFilters(state: AlgorithmState) {
  const { results, filters } = state
  const {
    seqNamesFilter,
    mutationsFilter,
    aaFilter,
    cladesFilter,
    hasQcIssuesFilter,
    hasNoQcIssuesFilter,
    hasErrorsFilter,
  } = filters

  let filtered = results
  if (seqNamesFilter) {
    filtered = filtered.filter(filterBySeqName(seqNamesFilter))
  }

  if (mutationsFilter) {
    filtered = filtered.filter(filterByNucleotideMutations(mutationsFilter))
  }

  if (aaFilter) {
    filtered = filtered.filter(filterByAminoacidChanges(aaFilter))
  }

  if (cladesFilter) {
    filtered = filtered.filter(filterByClades(cladesFilter))
  }

  filtered = filtered.filter(filterByQCIssues({ hasNoQcIssuesFilter, hasQcIssuesFilter, hasErrorsFilter }))

  return filtered as DeepWritable<typeof filtered>
}
