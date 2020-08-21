import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultSNPClusters } from 'src/algorithms/QC/ruleSnpClusters'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCSNPClusters<TFunction extends TFunctionInterface>(
  t: TFunction,
  snpClusters?: DeepReadonly<QCResultSNPClusters>,
) {
  if (!snpClusters || snpClusters.score === 0) {
    return undefined
  }

  const { score, totalSNPs } = snpClusters
  return t('Found {{nClusters}} SNP clusters with total of {{total}} mutations. QC score: {{score}}', {
    total: totalSNPs,
    nClusters: snpClusters.clusteredSNPs.length,
    score: round(score),
  })
}
