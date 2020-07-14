import type {
  QCDiagnostics,
  QCResult,
  NucleotideDeletion,
  NucleotideSubstitution,
  NucleotideInsertion,
  Virus,
} from '../types'
import { ruleMissingData } from './ruleMissingData'
import { ruleMixedSites } from './ruleMixedSites'
import { ruleSnpClusters } from './ruleSNPClusters'
import { ruleTotalMutations } from './ruleTotalMutations'

const TooHighDivergence = 'too high divergence'
const ClusteredSNPsFlag = 'clustered SNPs'
const TooManyMixedSites = 'Too many non-ACGT characters'
const MissingData = 'missing data'

const rules = [
  {
    name: 'total-mutations',
    config: {},
    implementation: ruleTotalMutations,
  },
  {
    name: 'missing-data',
    config: {},
    implementation: ruleMissingData,
  },
  {
    name: 'snp-clusters',
    config: {},
    implementation: ruleSnpClusters,
  },
  {
    name: 'mixed-sites',
    config: {},
    implementation: ruleMixedSites,
  },
]

export interface RunQCParams {
  QCParams: Virus
  mutations: NucleotideSubstitution[]
  insertions: NucleotideInsertion[]
  deletions: NucleotideDeletion[]
  alignedQuery: string
}

export function runQC(params: RunQCParams): QCResult {
  return rules.map((rule) => rule.implementation(rule.config, params))

  // const flags: string[] = []
  // const diagnostics: QCDiagnostics = { clusteredSNPs, totalMixedSites, totalNumberOfMutations }
  // return { flags, diagnostics, nucleotideComposition }
}
