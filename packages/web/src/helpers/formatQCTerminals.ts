import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultTerminalMutations } from 'src/algorithms/QC/ruleTerminalMutations'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCTerminals<TFunction extends TFunctionInterface>(
  t: TFunction,
  terminalMutations?: DeepReadonly<QCResultTerminalMutations>,
) {
  if (!terminalMutations || terminalMutations.score === 0) {
    return undefined
  }

  const { score, zScore, nStd } = terminalMutations
  return t(
    'Too many terminal mutations. {{total}} standard deviations away, {{allowed}} allowed. QC score: {{score}}.',
    {
      total: zScore,
      allowed: nStd,
      score: round(score),
    },
  )
}
