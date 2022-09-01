import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultSnpClusters } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/types'

export function formatQCSNPClusters<TFunction extends TFunctionInterface>(
  t: TFunction,
  snpClusters?: DeepReadonly<QcResultSnpClusters>,
) {
  if (!snpClusters || snpClusters.status === QcStatus.good) {
    return undefined
  }

  const { score, clusteredSNPs, totalSNPs, status } = snpClusters

  let message = t('Mutation clusters found')
  if (status === QcStatus.bad) {
    message = t('Too many mutation clusters found')
  }

  return t('{{message}}. Seen {{nClusters}} mutation clusters with total of {{total}} mutations. QC score: {{score}}', {
    message,
    total: totalSNPs,
    nClusters: clusteredSNPs.length,
    score: round(score),
  })
}
