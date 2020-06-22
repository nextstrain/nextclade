import type { VirusParams } from './types'

export const SARSCOV2: VirusParams = {
  QCParams: {
    knownClusters: new Set([28881, 28882, 28883]),
    windowSize: 100, // window along the genome to look for a cluster
    clusterCutOff: 6, // number of mutations within that window to trigger a cluster
    divergenceThreshold: 15, // number of mutations to trigger divergence warning
    mixedSitesThreshold: 10, // number of non-ACGTN sites to trigger warning
    missingDataThreshold: 1000, // number of sites as N to trigger warning
  },
  clades: {
    '19A': [
      { pos: 8782, allele: 'C' },
      { pos: 14408, allele: 'C' },
    ],
    '19B': [
      { pos: 8782, allele: 'T' },
      { pos: 28144, allele: 'C' },
    ],
    '20A': [
      { pos: 8782, allele: 'C' },
      { pos: 14408, allele: 'T' },
      { pos: 23403, allele: 'G' },
    ],
    '20B': [
      { pos: 8782, allele: 'C' },
      { pos: 14408, allele: 'T' },
      { pos: 23403, allele: 'G' },
      { pos: 28881, allele: 'A' },
      { pos: 28882, allele: 'A' },
    ],
    '20C': [
      { pos: 1059, allele: 'T' },
      { pos: 8782, allele: 'C' },
      { pos: 14408, allele: 'T' },
      { pos: 23403, allele: 'G' },
      { pos: 25563, allele: 'T' },
    ],
  },
} as const
