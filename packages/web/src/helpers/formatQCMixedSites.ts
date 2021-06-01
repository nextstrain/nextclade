import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultMixedSites } from 'src/algorithms/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/algorithms/types'

export function formatQCMixedSites<TFunction extends TFunctionInterface>(
  t: TFunction,
  mixedSites?: DeepReadonly<QcResultMixedSites>,
) {
  if (!mixedSites || mixedSites.status === QcStatus.good) {
    return undefined
  }

  const { score, totalMixedSites, mixedSitesThreshold, status } = mixedSites

  let message = t('Mixed sites found')
  if (status === QcStatus.bad) {
    message = t('Too many mixed sites found')
  }

  return t('{{message}}: total {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    message,
    total: totalMixedSites,
    allowed: mixedSitesThreshold,
    score: round(score),
  })
}
