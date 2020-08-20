import type { AnalysisResult, NucleotideSubstitution } from 'src/algorithms/types'

export interface QCRulesConfigDivergence {
  divergenceMean: number
  divergenceStd: number
  nStd: number
}

export function ruleTerminalMutations(
  { substitutions, insertions, deletions }: AnalysisResult,
  terminalMutations: NucleotideSubstitution[],
  { divergenceMean, divergenceStd, nStd }: QCRulesConfigDivergence,
) {
  const totalNumberOfMutations =
    Object.keys(substitutions).length + Object.keys(insertions).length + Object.keys(deletions).length

  // the score hits 100 if the deviation is nStd times the standard deviation.
  // escalation is quadratic as it should be for a Poisson process
  const zScore = (totalNumberOfMutations - divergenceMean) / divergenceStd
  const score = (100 * zScore * zScore) / (nStd * nStd)
  return { score, zScore, nStd }
}

export type QCResultTerminalMutations = ReturnType<typeof ruleTerminalMutations>
