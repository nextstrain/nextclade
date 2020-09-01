import type { AnalysisResultWithClade, NucleotideSubstitution } from 'src/algorithms/types'

import type { QCRulesConfig } from './qcRulesConfig'
import { getQCRuleStatus, QCRuleStatus } from './QCRuleStatus'
import { ruleMissingData, QCResultMissingData } from './ruleMissingData'
import { ruleMixedSites, QCResultMixedSites } from './ruleMixedSites'
import { ruleSnpClusters, QCResultSNPClusters } from './ruleSnpClusters'
import { rulePrivateMutations, QCResultPrivateMutations } from './rulePrivateMutations'

export type Enableable<T> = T & { enabled: boolean }

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

export type Rule<Conf, Ret> = (
  analysisResult: AnalysisResultWithClade,
  privateMutations: NucleotideSubstitution[],
  config: Conf,
) => Ret

export function runOne<Conf extends Enableable<unknown>, Ret extends QCRuleResult>(
  rule: Rule<Conf, Ret>,
  analysisResult: AnalysisResultWithClade,
  privateMutations: NucleotideSubstitution[],
  config: Conf,
): Ret | undefined {
  return config.enabled ? rule(analysisResult, privateMutations, config) : undefined
}

export interface RunQCParams {
  analysisResult: AnalysisResultWithClade
  privateMutations: NucleotideSubstitution[]
  qcRulesConfig: QCRulesConfig
}

export function runQC({ analysisResult, privateMutations, qcRulesConfig }: RunQCParams): QCResult {
  const result = {
    privateMutations: runOne(rulePrivateMutations, analysisResult, privateMutations, qcRulesConfig.privateMutations),
    missingData: runOne(ruleMissingData, analysisResult, privateMutations, qcRulesConfig.missingData),
    snpClusters: runOne(ruleSnpClusters, analysisResult, privateMutations, qcRulesConfig.snpClusters),
    mixedSites: runOne(ruleMixedSites, analysisResult, privateMutations, qcRulesConfig.mixedSites),
  }

  const score = Object.values(result).reduce((acc, r) => acc + ((r?.score ?? 0) * (r?.score ?? 0)) / 100, 0)

  const status = getQCRuleStatus(score)

  return { seqName: analysisResult.seqName, ...result, overallScore: score, overallStatus: status }
}
