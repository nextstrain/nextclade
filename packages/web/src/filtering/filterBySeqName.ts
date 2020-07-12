import { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import { splitFilterString } from 'src/filtering/splitFilterString'

export function filterBySeqName(seqNamesFilter: string) {
  const seqNamesFilters = splitFilterString(seqNamesFilter)

  return (result: SequenceAnylysisState) => {
    return seqNamesFilters.some((filter) => result.seqName.includes(filter))
  }
}
