import type { NucleotideInsertion } from 'src/algorithms/types'

export function formatInsertion({ pos, ins }: NucleotideInsertion) {
  return `${pos}:${ins}`
}
