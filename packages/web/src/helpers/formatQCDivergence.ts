import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultDivergence } from 'src/algorithms/QC/ruleDivergence'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCDivergence<TFunction extends TFunctionInterface>(
  t: TFunction,
  divergence?: DeepReadonly<QCResultDivergence>,
) {
  if (!divergence || divergence.score === 0) {
    return undefined
  }

  const { score, zScore, nStd } = divergence
  return t(
    'Divergence is too high or too low. {{total}} standard deviations away, {{allowed}} allowed. QC score: {{score}}.',
    {
      total: zScore,
      allowed: nStd,
      score: round(score),
    },
  )
}
