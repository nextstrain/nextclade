import { merge } from 'lodash'

import { DeepPartial } from 'ts-essentials'
import type { NucleotideDeletion, NucleotideInsertion, SubstitutionsWithAminoacids } from '../types'
import { ruleMissingData, QCRulesConfigMissingData, QCResultMissingData } from './ruleMissingData'
import { ruleMixedSites, QCRulesConfigMixedSites, QCResultMixedSites } from './ruleMixedSites'
import { QCResultSNPClusters, QCRulesConfigSNPClusters, ruleSnpClusters } from './ruleSnpClusters'
import { ruleTotalMutations, QCRulesConfigTotalMutations, QCResultTotalMutations } from './ruleTotalMutations'

// const TooHighDivergence = 'too high divergence'
// const ClusteredSNPsFlag = 'clustered SNPs'
// const TooManyMixedSites = 'Too many non-ACGT characters'
// const MissingData = 'missing data'

export type Enableable<T> = T & { enabled: boolean }

export interface QCRulesConfig {
  totalMutations: Enableable<QCRulesConfigTotalMutations>
  missingData: Enableable<QCRulesConfigMissingData>
  snpClusters: Enableable<QCRulesConfigSNPClusters>
  mixedSites: Enableable<QCRulesConfigMixedSites>
}

const qcRulesConfigDefault: QCRulesConfig = {
  totalMutations: {
    enabled: true,
    divergenceThreshold: 20, // number of mutations to trigger divergence warning
    scoreWeight: 1,
    scoreBias: 0,
    scoreMax: Infinity,
  },
  missingData: {
    enabled: true,
    missingDataThreshold: 1000, // number of sites as N to trigger warning
    scoreWeight: 0.1,
    scoreBias: 0,
    scoreMax: Infinity,
  },
  snpClusters: {
    enabled: true,
    totalSNPsThreshold: 0,
    knownClusters: new Set([28881, 28882, 28883]),
    windowSize: 100, // window along the genome to look for a cluster
    clusterCutOff: 6, // number of mutations within that window to trigger a cluster
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

export interface QCInputData {
  substitutions: SubstitutionsWithAminoacids[]
  insertions: NucleotideInsertion[]
  deletions: NucleotideDeletion[]
  alignedQuery: string
  nucleotideComposition: Record<string, number>
}

export interface QCResults {
  score: number
  totalMutations?: QCResultTotalMutations
  missingData?: QCResultMissingData
  snpClusters?: QCResultSNPClusters
  mixedSites?: QCResultMixedSites
}

export type Rule<Conf, Ret> = (d: QCInputData, c: Conf) => Ret

export function runOne<Conf extends Enableable<unknown>, Ret>(
  rule: Rule<Conf, Ret>,
  data: QCInputData,
  config: Conf,
): Ret | undefined {
  return config.enabled ? rule(data, config) : undefined
}

export function runQC(qcData: QCInputData, qcRulesConfig: DeepPartial<QCRulesConfig>): QCResults {
  const configs: QCRulesConfig = merge(qcRulesConfigDefault, qcRulesConfig)

  const result = {
    totalMutations: runOne(ruleTotalMutations, qcData, configs.totalMutations),
    missingData: runOne(ruleMissingData, qcData, configs.missingData),
    snpClusters: runOne(ruleSnpClusters, qcData, configs.snpClusters),
    mixedSites: runOne(ruleMixedSites, qcData, configs.mixedSites),
  }

  const score = Object.values(result).reduce((acc, r) => acc + (r?.score ?? 0), 0)
  return { ...result, score }
}
