import { NucleotideSubstitution } from 'src/algorithms/types'

export function formatMutation({ pos, queryNuc, refNuc }: NucleotideSubstitution) {
  // NOTE: by convention, nucleotides are numbered starting from 1, however our arrays are 0-based
  const positionOneBased = pos + 1
  return `${refNuc}${positionOneBased}${queryNuc}`
}
