import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultMixedSites } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCMixedSites<TFunction extends TFunctionInterface>(
  t: TFunction,
  mixedSites?: DeepReadonly<QcResultMixedSites>,
) {
  if (!mixedSites || mixedSites.status === 'good') {
    return undefined
  }

  const { score, totalMixedSites, mixedSitesThreshold, status } = mixedSites

  let message = t('Mixed sites found')
  if (status === 'bad') {
    message = t('Too many mixed sites found')
  }

  return t('{{message}}: total {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    message,
    total: totalMixedSites,
    allowed: mixedSitesThreshold,
    score: round(score),
  })
}
