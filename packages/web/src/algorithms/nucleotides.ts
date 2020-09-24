import type { Nucleotide } from 'src/algorithms/types'

/** Type-safe constants for the nucleotides we recognize */
export const A = 'A' as Nucleotide
export const T = 'T' as Nucleotide
export const G = 'G' as Nucleotide
export const C = 'C' as Nucleotide
export const N = 'N' as Nucleotide
export const X = 'X' as Nucleotide
export const GAP = '-' as Nucleotide
export const ANY = '.' as const

export const GOOD_NUCLEOTIDES: Nucleotide[] = [A, T, G, C, N, GAP]
