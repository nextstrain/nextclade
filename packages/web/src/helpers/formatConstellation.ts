import type { Constellation } from 'src/algorithms/types'
import { formatAAMutation, formatAADeletion } from 'src/helpers/formatMutation'

export function formatConstellation(constellation: Constellation) {
  const { description, url } = constellation
  const muts = constellation.substitutions.map(formatAAMutation).join(';')
  const dels = constellation.deletions.map(formatAADeletion).join(';')
  return `${url} ${description} ${muts};${dels}`
}
