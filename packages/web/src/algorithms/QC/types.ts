import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'
import { QCResultMissingData, QCRulesConfigMissingData } from 'src/algorithms/QC/ruleMissingData'
import { QCResultMixedSites, QCRulesConfigMixedSites } from 'src/algorithms/QC/ruleMixedSites'
import { QCResultPrivateMutations, QCRulesConfigPrivateMutations } from 'src/algorithms/QC/rulePrivateMutations'
import { QCResultSNPClusters, QCRulesConfigSNPClusters } from 'src/algorithms/QC/ruleSnpClusters'

export type Enableable<T> = T & { enabled: boolean }

export interface QCRulesConfig {
  privateMutations: Enableable<QCRulesConfigPrivateMutations>
  missingData: Enableable<QCRulesConfigMissingData>
  snpClusters: Enableable<QCRulesConfigSNPClusters>
  mixedSites: Enableable<QCRulesConfigMixedSites>
}

export interface QCResult {
  seqName: string
  overallScore: number
  overallStatus: QCRuleStatus
  privateMutations?: QCResultPrivateMutations
  missingData?: QCResultMissingData
  snpClusters?: QCResultSNPClusters
  mixedSites?: QCResultMixedSites
}

export interface QCRuleResult {
  score: number
  status: QCRuleStatus
}
