import { NucleotideSubstitution } from 'src/algorithms/types'

export function formatMutation({ pos, queryNuc, refNuc }: NucleotideSubstitution) {
  return `${refNuc}${pos + 1}${queryNuc}`
}
