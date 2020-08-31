import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultMixedSites } from 'src/algorithms/QC/ruleMixedSites'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export function formatQCMixedSites<TFunction extends TFunctionInterface>(
  t: TFunction,
  mixedSites?: DeepReadonly<QCResultMixedSites>,
) {
  if (!mixedSites || mixedSites.status === QCRuleStatus.good) {
    return undefined
  }

  const { score, totalMixedSites, mixedSitesThreshold, status } = mixedSites

  let message = t('Mixed sites found')
  if (status === QCRuleStatus.bad) {
    message = t('Too many mixed sites found')
  }

  return t('{{message}}: total {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    message,
    total: totalMixedSites,
    allowed: mixedSitesThreshold,
    score: round(score),
  })
}
