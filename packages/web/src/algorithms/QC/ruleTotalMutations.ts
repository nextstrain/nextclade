import { clamp } from 'lodash'

import type { QCInputData } from './runQC'

export interface QCRulesConfigTotalMutations {
  divergenceThreshold: number
  scoreWeight: number
  scoreBias: number
  scoreMax: number
}

export function ruleTotalMutations(
  { substitutions, insertions, deletions }: QCInputData,
  { divergenceThreshold, scoreWeight, scoreBias, scoreMax }: QCRulesConfigTotalMutations,
) {
  const totalNumberOfMutations =
    Object.keys(substitutions).length + Object.keys(insertions).length + Object.keys(deletions).length

  let scoreRaw = 0
  if (totalNumberOfMutations) {
    scoreRaw = totalNumberOfMutations * scoreWeight - scoreBias
  }
  const score = clamp(scoreRaw, 0, scoreMax)

  return {
    score,
    totalNumberOfMutations,
    divergenceThreshold,
  }
}

export type QCResultTotalMutations = ReturnType<typeof ruleTotalMutations>
