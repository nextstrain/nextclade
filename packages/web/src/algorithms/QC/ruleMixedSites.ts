import { clamp } from 'lodash'

import type { AnalysisResultWithClade, NucleotideSubstitution } from 'src/algorithms/types'
import { getQCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export interface QCRulesConfigMixedSites {
  mixedSitesThreshold: number
}

export function ruleMixedSites(
  { nucleotideComposition }: AnalysisResultWithClade,
  _1: NucleotideSubstitution[],
  { mixedSitesThreshold }: QCRulesConfigMixedSites,
) {
  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])

  const totalMixedSites = Object.keys(nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + nucleotideComposition[b], 0)

  let score = 100 * (totalMixedSites / mixedSitesThreshold)
  score = clamp(score, 0, Infinity)

  const status = getQCRuleStatus(score)

  return { score, totalMixedSites, mixedSitesThreshold, status }
}

export type QCResultMixedSites = ReturnType<typeof ruleMixedSites>
