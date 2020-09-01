import type { QCRulesConfigPrivateMutations } from 'src/algorithms/QC/rulePrivateMutations'
import type { QCRulesConfigMissingData } from 'src/algorithms/QC/ruleMissingData'
import type { QCRulesConfigSNPClusters } from 'src/algorithms/QC/ruleSnpClusters'
import type { QCRulesConfigMixedSites } from 'src/algorithms/QC/ruleMixedSites'
import type { Enableable } from 'src/algorithms/QC/runQC'

export interface QCRulesConfig {
  privateMutations: Enableable<QCRulesConfigPrivateMutations>
  missingData: Enableable<QCRulesConfigMissingData>
  snpClusters: Enableable<QCRulesConfigSNPClusters>
  mixedSites: Enableable<QCRulesConfigMixedSites>
}

export const qcRulesConfigDefault: QCRulesConfig = {
  privateMutations: {
    enabled: true,
    typical: 2, // expected number of mutations
    cutoff: 8, // trigger QC warning if the typical value exceeds this value
  },
  missingData: {
    enabled: true,
    missingDataThreshold: 2700, // number of sites as N to trigger warning
    scoreBias: 300, // 300 missing sites is considered the norm
  },
  snpClusters: {
    enabled: true,
    windowSize: 100, // window along the genome to look for a cluster
    clusterCutOff: 4, // number of mutations within that window to trigger a cluster
    scoreWeight: 50, // each cluster counts for 50
  },
  mixedSites: {
    enabled: true,
    mixedSitesThreshold: 10, // number of non-ACGTN sites to trigger warning
  },
} as const
