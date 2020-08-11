import { clamp } from 'lodash'

import type { AnalysisResult } from 'src/algorithms/types'

export interface QCRulesConfigMissingData {
  missingDataThreshold: number
  scoreWeight: number
  scoreBias: number
  scoreMax: number
}

export function ruleMissingData(
  { nucleotideComposition }: AnalysisResult,
  { missingDataThreshold, scoreWeight, scoreBias, scoreMax }: QCRulesConfigMissingData,
) {
  const totalMissing = nucleotideComposition.N ?? 0

  let scoreRaw = 0
  if (totalMissing > missingDataThreshold) {
    scoreRaw = (totalMissing - missingDataThreshold) * scoreWeight - scoreBias
  }
  const score = clamp(scoreRaw, 0, scoreMax)

  return {
    score,
    totalMissing,
    missingDataThreshold,
  }
}

export type QCResultMissingData = ReturnType<typeof ruleMissingData>
