import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QCResultMissingData } from 'src/algorithms/QC/ruleMissingData'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

export function formatQCMissingData<TFunction extends TFunctionInterface>(
  t: TFunction,
  missingData?: DeepReadonly<QCResultMissingData>,
) {
  if (!missingData || missingData.status === QCRuleStatus.good) {
    return undefined
  }

  const { score, totalMissing, missingDataThreshold, status } = missingData

  let message = t('Missing data found')
  if (status === QCRuleStatus.bad) {
    message = t('Too much missing data found')
  }

  return t('{{message}}. Total Ns: {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    message,
    total: totalMissing,
    allowed: missingDataThreshold,
    score: round(score),
  })
}
