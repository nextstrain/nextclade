import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import { formatClades } from 'src/helpers/formatClades'

import { splitFilterString } from './splitFilterString'

export function filterByClades(cladesFilter: string) {
  const cladesFilters = splitFilterString(cladesFilter)

  return (result: SequenceAnylysisState) => {
    if (!result?.result) {
      return false
    }

    const { cladeStr } = formatClades(result.result.clades)
    return cladesFilters.some((filter) => cladeStr.startsWith(filter))
  }
}
