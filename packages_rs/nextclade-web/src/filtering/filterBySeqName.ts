import type { NextcladeResult } from 'src/types'

import { splitFilterString } from './splitFilterString'

export function filterBySeqName(seqNamesFilter: string) {
  const seqNamesFilters = splitFilterString(seqNamesFilter)

  return (result: NextcladeResult) => {
    return seqNamesFilters.some((filter) => result.seqName.toLowerCase().includes(filter.toLowerCase()))
  }
}
