import { mapValues, pickBy } from 'lodash'
import merge from 'deepmerge'

import type { NucleotideDeletion, NucleotideInsertion, SubstitutionsWithAminoacids } from '../types'
import { ruleMissingData } from './ruleMissingData'
import { ruleMixedSites } from './ruleMixedSites'
import { ruleSnpClusters } from './ruleSnpClusters'
import { ruleTotalMutations } from './ruleTotalMutations'

// const TooHighDivergence = 'too high divergence'
// const ClusteredSNPsFlag = 'clustered SNPs'
// const TooManyMixedSites = 'Too many non-ACGT characters'
// const MissingData = 'missing data'

const rules = {
  totalMutations: { implementation: ruleTotalMutations },
  missingData: { implementation: ruleMissingData },
  snpClusters: { implementation: ruleSnpClusters },
  mixedSites: { implementation: ruleMixedSites },
} as const

export type Rules = typeof rules
export type RuleName = keyof Rules

const qcRulesConfigDefault = {
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

export type QCRulesConfig = typeof qcRulesConfigDefault

export interface QCInputData {
  substitutions: SubstitutionsWithAminoacids[]
  insertions: NucleotideInsertion[]
  deletions: NucleotideDeletion[]
  alignedQuery: string
  nucleotideComposition: Record<string, number>
}

export function runQC(qcData: QCInputData, qcRulesConfig: Partial<QCRulesConfig>) {
  const configs = merge(qcRulesConfigDefault, qcRulesConfig)
  const configsDeep = mapValues(configs, (config) => ({ config }))

  const rulesWithConfigs = merge(configsDeep, rules)

  const enabledRulesWithConfigs = pickBy(rulesWithConfigs, ({ config }) => config.enabled)

  return mapValues(enabledRulesWithConfigs, ({ implementation, config }) => {
    return implementation(qcData, config)
  })
}

export type QCResults = ReturnType<typeof runQC>
