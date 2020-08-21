import type { AnalysisResult, NucleotideSubstitution } from 'src/algorithms/types'

export interface QCRulesConfigPrivateMutations {
  typical: number
  cutoff: number
}

export function rulePrivateMutations(
  { substitutions, insertions, deletions }: AnalysisResult,
  privateMutations: NucleotideSubstitution[],
  { typical, cutoff }: QCRulesConfigPrivateMutations,
) {
  const totalNumberOfMutations =
    Object.keys(privateMutations).length + Object.keys(insertions).length + Object.keys(deletions).length

  // the score hits 100 if the excess mutations equals the cutoff value
  const score = (Math.max(0, totalNumberOfMutations - typical) * 100) / cutoff
  return { score, total: totalNumberOfMutations, excess: totalNumberOfMutations - typical, cutoff }
}

export type QCResultPrivateMutations = ReturnType<typeof rulePrivateMutations>
