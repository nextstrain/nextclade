import type { QCRulesConfig } from 'src/algorithms/QC/types'

export const qcRulesConfig: QCRulesConfig = {
  privateMutations: {
    enabled: true,
    typical: 8, // expected number of mutations
    cutoff: 24, // trigger QC warning if the typical value exceeds this value
  },
  missingData: {
    enabled: true,
    missingDataThreshold: 2700, // number of sites as N to trigger warning
    scoreBias: 300, // 300 missing sites is considered the norm
  },
  snpClusters: {
    enabled: true,
    windowSize: 100, // window along the genome to look for a cluster
    clusterCutOff: 6, // number of mutations within that window to trigger a cluster
    scoreWeight: 50, // each cluster counts for 50
  },
  mixedSites: {
    enabled: true,
    mixedSitesThreshold: 10, // number of non-ACGTN sites to trigger warning
  },
} as const
