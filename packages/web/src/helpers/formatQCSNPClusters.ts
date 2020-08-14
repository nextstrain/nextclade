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

  const { score, totalSNPs, totalSNPsThreshold } = snpClusters
  return t('Too many SNP clusters. Total clusters: {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    total: totalSNPs,
    allowed: totalSNPsThreshold,
    score: round(score),
  })
}
