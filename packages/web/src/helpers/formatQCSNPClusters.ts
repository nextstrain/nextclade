import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultSNPClusters } from 'src/algorithms/QC/ruleSnpClusters'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export function formatQCSNPClusters<TFunction extends TFunctionInterface>(
  t: TFunction,
  snpClusters?: DeepReadonly<QCResultSNPClusters>,
) {
  if (!snpClusters || snpClusters.status === QCRuleStatus.good) {
    return undefined
  }

  const { score, totalSNPs, status } = snpClusters

  let message = t('Mutation clusters found')
  if (status === QCRuleStatus.bad) {
    message = t('Too many mutation clusters found')
  }

  return t('{{message}}. Seen {{nClusters}} mutation clusters with total of {{total}} mutations. QC score: {{score}}', {
    message,
    total: totalSNPs,
    nClusters: snpClusters.clusteredSNPs.length,
    score: round(score),
  })
}
