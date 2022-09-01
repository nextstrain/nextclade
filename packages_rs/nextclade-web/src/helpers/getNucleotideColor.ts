import { get } from 'lodash'

import { Nucleotide } from 'src/types'

export const NUCLEOTIDE_COLORS: Record<string, string> = {
  'A': '#B54330',
  'C': '#3C5BD6',
  'G': '#9C8D1C',
  'T': '#409543',
  'N': '#555555',
  '-': '#777777',
} as const

export function getNucleotideColor(nuc: Nucleotide) {
  return get(NUCLEOTIDE_COLORS, nuc) ?? NUCLEOTIDE_COLORS.N
}
