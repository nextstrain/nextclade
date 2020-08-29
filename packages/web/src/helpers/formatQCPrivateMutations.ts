import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultPrivateMutations } from 'src/algorithms/QC/rulePrivateMutations'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export function formatQCPrivateMutations<TFunction extends TFunctionInterface>(
  t: TFunction,
  privateMutations?: DeepReadonly<QCResultPrivateMutations>,
) {
  if (!privateMutations || privateMutations.status === QCRuleStatus.good) {
    return undefined
  }

  const { score, total, excess, cutoff, status } = privateMutations

  let message = t('')
  if (status === QCRuleStatus.bad) {
    message = t('Too many private mutations. ')
  }

  return t(
    '{{message}}{{total}} private mutations seen, {{excess}} more than expected (more than {{cutoff}} is considered problematic). QC score: {{score}}',
    {
      message,
      total,
      excess,
      cutoff,
      score: round(score),
    },
  )
}
