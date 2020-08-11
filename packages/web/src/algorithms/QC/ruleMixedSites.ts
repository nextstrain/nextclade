import { clamp } from 'lodash'

import type { AnalysisResult } from 'src/algorithms/types'

export interface QCRulesConfigMixedSites {
  mixedSitesThreshold: number
  scoreWeight: number
  scoreBias: number
  scoreMax: number
}

export function ruleMixedSites(
  { nucleotideComposition }: AnalysisResult,
  { mixedSitesThreshold, scoreWeight, scoreBias, scoreMax }: QCRulesConfigMixedSites,
) {
  const goodBases = new Set(['A', 'C', 'G', 'T', 'N', '-'])

  const totalMixedSites = Object.keys(nucleotideComposition)
    .filter((d) => !goodBases.has(d))
    .reduce((a, b) => a + nucleotideComposition[b], 0)

  let scoreRaw = 0
  if (totalMixedSites > mixedSitesThreshold) {
    scoreRaw = (totalMixedSites - mixedSitesThreshold) * scoreWeight - scoreBias
  }
  const score = clamp(scoreRaw, 0, scoreMax)

  return {
    score,
    totalMixedSites,
    mixedSitesThreshold,
  }
}

export type QCResultMixedSites = ReturnType<typeof ruleMixedSites>
