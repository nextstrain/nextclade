import type { QCInputData } from './runQC'

export interface QCRulesConfigDivergence {
  divergenceMean: number
  divergenceStd: number
  nStd: number
}

export function ruleDivergence(
  { substitutions, insertions, deletions }: QCInputData,
  { divergenceMean, divergenceStd, nStd }: QCRulesConfigDivergence,
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

export type QCResultDivergence = ReturnType<typeof ruleDivergence>
