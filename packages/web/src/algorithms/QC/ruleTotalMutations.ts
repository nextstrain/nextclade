import type { QCInputData } from './runQC'

export interface QCRulesConfigTotalMutations {
  divergenceMean: number
  divergenceStd: number
  nStd: number
}

export function ruleTotalMutations(
  { substitutions, insertions, deletions }: QCInputData,
  { divergenceMean, divergenceStd, nStd }: QCRulesConfigTotalMutations,
) {
  const totalNumberOfMutations =
    Object.keys(substitutions).length + Object.keys(insertions).length + Object.keys(deletions).length

  // the score hits 100 if the deviation is nStd times the standard deviation.
  // escalation is quadratic as it should be for a Poisson process
  const scale = divergenceStd * nStd * 100
  const dev = totalNumberOfMutations - divergenceMean
  const score = (dev * dev) / scale / scale

  return {
    score,
    totalNumberOfMutations,
    nStd,
  }
}

export type QCResultTotalMutations = ReturnType<typeof ruleTotalMutations>
