import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultPrivateMutations } from 'src/algorithms/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/algorithms/types'

export function formatQCPrivateMutations<TFunction extends TFunctionInterface>(
  t: TFunction,
  privateMutations?: DeepReadonly<QcResultPrivateMutations>,
) {
  if (!privateMutations || privateMutations.status === QcStatus.good) {
    return undefined
  }

  const { score, total, excess, cutoff, status } = privateMutations

  let message = t('')
  if (status === QcStatus.bad) {
    message = t('Too many private mutations. ')
  }

  return t(
    '{{message}}{{total}} private mutations seen. Up to {{excess}} is expected, {{cutoff}} or more is considered problematic.',
    {
      message,
      total,
      excess,
      cutoff,
      score: round(score),
    },
  )
}
