import merge from 'deepmerge'

import type { NucleotideDeletion, NucleotideInsertion, SubstitutionsWithAminoacids } from '../types'
import { ruleMissingData, QCRulesConfigMissingData } from './ruleMissingData'
import { ruleMixedSites, QCRulesConfigMixedSites } from './ruleMixedSites'
import { QCRulesConfigSNPClusters, ruleSnpClusters } from './ruleSnpClusters'
import { ruleTotalMutations, QCRulesConfigTotalMutations } from './ruleTotalMutations'

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
    scoreWeight: 1,
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

export function runOne<F extends (d: D, c: C) => unknown, D, C extends Enableable<unknown>>(f: F, data: D, config: C) {
  return config.enabled ? f(data, config) : undefined
}

export function runQC(qcData: QCInputData, qcRulesConfig: Partial<QCRulesConfig>) {
  const configs = merge(qcRulesConfigDefault, qcRulesConfig)

  return {
    totalMutations: runOne(ruleTotalMutations, qcData, configs.totalMutations),
    missingData: runOne(ruleMissingData, qcData, configs.missingData),
    snpClusters: runOne(ruleSnpClusters, qcData, configs.snpClusters),
    mixedSites: runOne(ruleMixedSites, qcData, configs.mixedSites),
  }
}

export type QCResults = ReturnType<typeof runQC>
