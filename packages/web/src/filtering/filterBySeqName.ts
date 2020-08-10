import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'

import { splitFilterString } from './splitFilterString'

export function filterBySeqName(seqNamesFilter: string) {
  const seqNamesFilters = splitFilterString(seqNamesFilter)

  return (result: SequenceAnalysisState) => {
    return seqNamesFilters.some((filter) => result.seqName.includes(filter))
  }
}
