import { clamp } from 'lodash'

import type { AnalysisResult, NucleotideSubstitution } from 'src/algorithms/types'

export interface QCRulesConfigMixedSites {
  mixedSitesThreshold: number
  scoreMax: number
}

export function ruleMixedSites(
  { nucleotideComposition }: AnalysisResult,
  _1: NucleotideSubstitution[],
  { mixedSitesThreshold, scoreMax }: QCRulesConfigMixedSites,
) {
  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])

  const totalMixedSites = Object.keys(nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + nucleotideComposition[b], 0)

  let scoreRaw = 0
  scoreRaw = 100 * (totalMixedSites / mixedSitesThreshold)

  const score = clamp(scoreRaw, 0, scoreMax)

  return { score, totalMixedSites, mixedSitesThreshold }
}

export type QCResultMixedSites = ReturnType<typeof ruleMixedSites>
