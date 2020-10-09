import type { AnalysisResultWithClade, NucleotideSubstitution } from 'src/algorithms/types'
import { getQCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'
import { clamp } from 'lodash'

export interface QCRulesConfigPrivateMutations {
  typical: number
  cutoff: number
}

export function rulePrivateMutations(
  { substitutions, insertions, deletions }: AnalysisResultWithClade,
  privateMutations: NucleotideSubstitution[],
  { typical, cutoff }: QCRulesConfigPrivateMutations,
) {
  const totalNumberOfMutations =
    Object.keys(privateMutations).length + Object.keys(insertions).length + Object.keys(deletions).length

  // the score hits 100 if the excess mutations equals the cutoff value
  let score = (Math.max(0, totalNumberOfMutations - typical) * 100) / cutoff
  score = clamp(score, 0, Infinity)

  const status = getQCRuleStatus(score)

  return { score, total: totalNumberOfMutations, excess: totalNumberOfMutations - typical, cutoff, status }
}

export type QCResultPrivateMutations = ReturnType<typeof rulePrivateMutations>
