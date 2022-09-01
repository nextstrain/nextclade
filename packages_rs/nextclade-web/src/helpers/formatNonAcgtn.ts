import { NucleotideRange } from 'src/types'
import { formatRange } from 'src/helpers/formatRange'

export function formatNonAcgtn({ character, begin, end }: NucleotideRange) {
  const range = formatRange(begin, end)
  return `${character}:${range}`
}
