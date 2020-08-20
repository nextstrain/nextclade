import { merge } from 'lodash'

import { DeepPartial } from 'ts-essentials'

import type { AnalysisResultWithClade, NucleotideSubstitution } from 'src/algorithms/types'

import { ruleMissingData, QCRulesConfigMissingData, QCResultMissingData } from './ruleMissingData'
import { ruleMixedSites, QCRulesConfigMixedSites, QCResultMixedSites } from './ruleMixedSites'
import { QCResultSNPClusters, QCRulesConfigSNPClusters, ruleSnpClusters } from './ruleSnpClusters'
import { ruleTerminalMutations, QCRulesConfigDivergence, QCResultTerminalMutations } from './ruleTerminalMutations'

// const TooHighDivergence = 'too high divergence'
// const ClusteredSNPsFlag = 'clustered SNPs'
// const TooManyMixedSites = 'Too many non-ACGT characters'
// const MissingData = 'missing data'

export type Enableable<T> = T & { enabled: boolean }

export interface QCRulesConfig {
  terminalMutations: Enableable<QCRulesConfigDivergence>
  missingData: Enableable<QCRulesConfigMissingData>
  snpClusters: Enableable<QCRulesConfigSNPClusters>
  mixedSites: Enableable<QCRulesConfigMixedSites>
}

const qcRulesConfigDefault: QCRulesConfig = {
  terminalMutations: {
    enabled: true,
    divergenceMean: 2, // expected number of mutations
    divergenceStd: 3, // expected standard deviation around mean
    nStd: 3, // number of standard deviations to trigger QC warning
  },
  missingData: {
    enabled: true,
    missingDataThreshold: 1000, // number of sites as N to trigger warning
    scoreWeight: 0.01,
    scoreBias: 0,
    scoreMax: Infinity,
  },
  snpClusters: {
    enabled: true,
    totalSNPsThreshold: 0,
    windowSize: 100, // window along the genome to look for a cluster
    clusterCutOff: 4, // number of mutations within that window to trigger a cluster
    scoreWeight: 1,
    scoreBias: 0,
    scoreMax: Infinity,
  },
  mixedSites: {
    enabled: true,
    mixedSitesThreshold: 10, // number of non-ACGTN sites to trigger warning
    scoreWeight: 1,
    scoreBias: 0,
    scoreMax: Infinity,
  },
} as const

export interface QCResult {
  seqName: string
  score: number
  terminalMutations?: QCResultTerminalMutations
  missingData?: QCResultMissingData
  snpClusters?: QCResultSNPClusters
  mixedSites?: QCResultMixedSites
}

export type Rule<Conf, Ret> = (
  analysisResult: AnalysisResultWithClade,
  terminalMutations: NucleotideSubstitution[],
  config: Conf,
) => Ret

export function runOne<Conf extends Enableable<unknown>, Ret>(
  rule: Rule<Conf, Ret>,
  analysisResult: AnalysisResultWithClade,
  terminalMutations: NucleotideSubstitution[],
  config: Conf,
): Ret | undefined {
  return config.enabled ? rule(analysisResult, terminalMutations, config) : undefined
}

export interface RunQCParams {
  analysisResult: AnalysisResultWithClade
  terminalMutations: NucleotideSubstitution[]
  qcRulesConfig: DeepPartial<QCRulesConfig>
}

export function runQC({ analysisResult, terminalMutations, qcRulesConfig }: RunQCParams): QCResult {
  // TODO: set initial state to default object in redux store instead of merging objects here every time
  const configs: QCRulesConfig = merge(qcRulesConfigDefault, qcRulesConfig)

  const result = {
    divergence: runOne(ruleTerminalMutations, analysisResult, terminalMutations, configs.terminalMutations),
    missingData: runOne(ruleMissingData, analysisResult, terminalMutations, configs.missingData),
    snpClusters: runOne(ruleSnpClusters, analysisResult, terminalMutations, configs.snpClusters),
    mixedSites: runOne(ruleMixedSites, analysisResult, terminalMutations, configs.mixedSites),
  }

  const score = Object.values(result).reduce((acc, r) => acc + (r?.score ?? 0), 0)
  return { seqName: analysisResult.seqName, ...result, score }
}
