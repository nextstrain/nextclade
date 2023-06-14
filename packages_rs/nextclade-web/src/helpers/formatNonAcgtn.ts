import type { NucleotideRange } from 'src/types'
import { formatRange } from 'src/helpers/formatRange'

export function formatNonAcgtn({ character, range }: NucleotideRange) {
  return `${character}:${formatRange(range)}`
}
