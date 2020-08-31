import type { Virus } from './types'
import { A, T, G, C } from './nucleotides'

export const VIRUSES: Record<string, Virus> = {
  'SARS-CoV-2': {
    minimalLength: 100,
    clades: {
      '19A': [
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: C },
      ],
      '19B': [
        { pos: 8782, nuc: T },
        { pos: 28144, nuc: C },
      ],
      '20A': [
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: T },
        { pos: 23403, nuc: G },
      ],
      '20B': [
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: T },
        { pos: 23403, nuc: G },
        { pos: 28881, nuc: A },
        { pos: 28882, nuc: A },
      ],
      '20C': [
        { pos: 1059, nuc: T },
        { pos: 8782, nuc: C },
        { pos: 14408, nuc: T },
        { pos: 23403, nuc: G },
        { pos: 25563, nuc: T },
      ],
    },
  },
}
