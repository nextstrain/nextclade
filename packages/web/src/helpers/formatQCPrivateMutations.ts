import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultPrivateMutations } from 'src/algorithms/QC/rulePrivateMutations'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCPrivateMutations<TFunction extends TFunctionInterface>(
  t: TFunction,
  privateMutations?: DeepReadonly<QCResultPrivateMutations>,
) {
  if (!privateMutations || privateMutations.score === 0) {
    return undefined
  }

  const { score, zScore, nStd } = privateMutations
  return t(
    'Too many terminal mutations. {{total}} standard deviations away, {{allowed}} allowed. QC score: {{score}}.',
    {
      total: zScore,
      allowed: nStd,
      score: round(score),
    },
  )
}
