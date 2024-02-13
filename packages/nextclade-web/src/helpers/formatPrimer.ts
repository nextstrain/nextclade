import type { PcrPrimerChange } from 'src/types'
import { formatMutation } from 'src/helpers/formatMutation'

export function formatPrimer(primerChange: PcrPrimerChange) {
  const { name } = primerChange.primer
  const muts = primerChange.substitutions.map(formatMutation).join(';')
  return `${name}:${muts}`
}
