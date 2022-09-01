import type { NextcladeResult } from 'src/types'

import { splitFilterString } from './splitFilterString'

export function filterByClades(cladesFilter: string) {
  const cladesFilters = splitFilterString(cladesFilter)

  return (result: NextcladeResult) => {
    if (!result.result) {
      return false
    }

    const { clade } = result.result.analysisResult
    return cladesFilters.some((filter) => clade.toLowerCase().startsWith(filter.toLowerCase()))
  }
}
