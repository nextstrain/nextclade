import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultRecombinants } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCRecombinants<TFunction extends TFunctionInterface>(
  t: TFunction,
  recombinants?: DeepReadonly<QcResultRecombinants>,
) {
  if (!recombinants || recombinants.status === 'good') {
    return undefined
  }

  const {
    score,
    totalPrivateSubstitutions,
    totalReversionSubstitutions,
    totalLabeledSubstitutions,
    totalUnlabeledSubstitutions,
    weightedThreshold,
    status,
  } = recombinants

  let message = t('Potentially recombinant sequence detected')
  if (status === 'bad') {
    message = t('Likely recombinant sequence detected')
  }

  if (weightedThreshold) {
    const { threshold, excess, weightedCount } = weightedThreshold
    return t(
      '{{message}}. Seen {{totalPrivateSubstitutions}} private mutations ({{totalReversionSubstitutions}} reversions, {{totalLabeledSubstitutions}} labeled, {{totalUnlabeledSubstitutions}} unlabeled). Weighted count: {{weightedCount}}, {{excess}} above threshold of {{threshold}}. QC score: {{score}}',
      {
        message,
        totalPrivateSubstitutions,
        totalReversionSubstitutions,
        totalLabeledSubstitutions,
        totalUnlabeledSubstitutions,
        weightedCount: round(weightedCount, 1),
        excess: round(excess, 1),
        threshold,
        score: round(score),
      },
    )
  }

  return t(
    '{{message}}. Seen {{totalPrivateSubstitutions}} private mutations ({{totalReversionSubstitutions}} reversions, {{totalLabeledSubstitutions}} labeled, {{totalUnlabeledSubstitutions}} unlabeled). QC score: {{score}}',
    {
      message,
      totalPrivateSubstitutions,
      totalReversionSubstitutions,
      totalLabeledSubstitutions,
      totalUnlabeledSubstitutions,
      score: round(score),
    },
  )
}
