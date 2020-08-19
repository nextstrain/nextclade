import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'

import { splitFilterString } from './splitFilterString'

export function filterByClades(cladesFilter: string) {
  const cladesFilters = splitFilterString(cladesFilter)

  return (result: SequenceAnalysisState) => {
    const clade = result?.result?.clade
    if (!clade) {
      return false
    }

    return cladesFilters.some((filter) => clade.startsWith(filter))
  }
}
