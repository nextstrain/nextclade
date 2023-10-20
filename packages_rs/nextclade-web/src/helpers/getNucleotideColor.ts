import { get } from 'lodash'

import { Nucleotide } from 'src/types'

export const NUCLEOTIDE_COLORS: Record<string, string> = {
  'A': '#b54330',
  'C': '#3c5bd6',
  'G': '#9c8d1c',
  'T': '#409543',
  'N': '#555555',
  'R': '#bd8262',
  'K': '#92a364',
  'S': '#61a178',
  'Y': '#5e959e',
  'M': '#897198',
  'W': '#a0a665',
  'B': '#5b9fbd',
  'H': '#949ce1',
  'D': '#d8cda0',
  'V': '#b496b3',
  '-': '#777777',
} as const

export function getNucleotideColor(nuc: Nucleotide) {
  return get(NUCLEOTIDE_COLORS, nuc) ?? NUCLEOTIDE_COLORS.N
}
