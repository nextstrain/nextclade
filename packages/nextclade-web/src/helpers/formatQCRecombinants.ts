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
    reversionClustering,
    status,
  } = recombinants

  let message = t('Potentially recombinant sequence detected')
  if (status === 'bad') {
    message = t('Likely recombinant sequence detected')
  }

  const parts: string[] = []

  if (weightedThreshold) {
    const { threshold, excess } = weightedThreshold
    parts.push(
      t('{{excess}} above threshold of {{threshold}}', {
        excess: round(excess),
        threshold,
      }),
    )
  }

  if (reversionClustering && reversionClustering.reversionClusters.length > 0) {
    parts.push(
      t('{{numClusters}} reversion cluster(s), ratio {{ratio}}', {
        numClusters: reversionClustering.reversionClusters.length,
        ratio: round(reversionClustering.reversionRatio, 2),
      }),
    )
  }

  const details = parts.length > 0 ? `, ${parts.join('; ')}` : ''

  return t(
    '{{message}}. Seen {{totalPrivateSubstitutions}} private mutations ({{totalReversionSubstitutions}} reversions, {{totalLabeledSubstitutions}} labeled, {{totalUnlabeledSubstitutions}} unlabeled){{details}}. QC score: {{score}}',
    {
      message,
      totalPrivateSubstitutions,
      totalReversionSubstitutions,
      totalLabeledSubstitutions,
      totalUnlabeledSubstitutions,
      details,
      score: round(score),
    },
  )
}
