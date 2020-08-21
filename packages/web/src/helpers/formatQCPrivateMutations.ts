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

  const { score, total, excess, cutoff } = privateMutations
  return t(
    '{{warn}} private mutations. {{total}} private mutations seen, {{excess}} more than expected (more than {{cutoff}} is considered problematic).',
    {
      warn: score > 100 ? 'Too many' : 'Many',
      total,
      excess,
      cutoff,
    },
  )
}
