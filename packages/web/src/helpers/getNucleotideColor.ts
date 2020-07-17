import { get } from 'lodash'

import { Nucleotide } from 'src/algorithms/types'

export const NUCLEOTIDE_COLORS: Record<string, string> = {
  'A': '#bf2b18',
  'C': '#162ebc',
  'G': '#bcaf27',
  'T': '#18b924',
  'N': '#555555',
  '-': '#777777',
} as const

export function getNucleotideColor(nuc: Nucleotide) {
  return get(NUCLEOTIDE_COLORS, nuc) ?? NUCLEOTIDE_COLORS.N
}
