import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultSnpClusters } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCSNPClusters<TFunction extends TFunctionInterface>(
  t: TFunction,
  snpClusters?: DeepReadonly<QcResultSnpClusters>,
) {
  if (!snpClusters || snpClusters.status === 'good') {
    return undefined
  }

  const { score, clusteredSNPs, totalSNPs, status } = snpClusters

  let message = t('Mutation clusters found')
  if (status === 'bad') {
    message = t('Too many mutation clusters found')
  }

  const clusterRanges = clusteredSNPs.map((c) => `${c.start + 1}-${c.end + 1}:${c.numberOfSnps}`).join(', ')

  return t(
    '{{message}}. {{nClusters}} cluster(s) with {{total}} total mutations. Positions: {{clusterRanges}}. QC score: {{score}}',
    {
      message,
      total: totalSNPs,
      nClusters: clusteredSNPs.length,
      clusterRanges,
      score: round(score),
    },
  )
}
