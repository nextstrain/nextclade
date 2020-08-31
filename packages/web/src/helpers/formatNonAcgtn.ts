import { NucleotideRange } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'

export function formatNonAcgtn({ nuc, begin, end }: NucleotideRange) {
  const range = formatRange(begin, end)
  return `${nuc}:${range}`
}
