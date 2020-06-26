import type { Virus } from './types'
import { A, T, G, C } from './nucleotides'

export const VIRUSES: Record<string, Virus> = {
  'SARS-CoV-2': {
    QCParams: {
      knownClusters: new Set([28881, 28882, 28883]),
      windowSize: 100, // window along the genome to look for a cluster
      clusterCutOff: 6, // number of mutations within that window to trigger a cluster
      divergenceThreshold: 20, // number of mutations to trigger divergence warning
      mixedSitesThreshold: 10, // number of non-ACGTN sites to trigger warning
      missingDataThreshold: 1000, // number of sites as N to trigger warning
    },
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
} as const
