import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import type { QcResultMissingData } from 'src/types'
import { QcStatus } from 'src/types'

export function formatQCMissingData<TFunction extends TFunctionInterface>(
  t: TFunction,
  missingData?: DeepReadonly<QcResultMissingData>,
) {
  if (!missingData || missingData.status === 'good') {
    return undefined
  }

  const { score, totalMissing, missingDataThreshold, status } = missingData

  let message = t('Missing data found')
  if (status === 'bad') {
    message = t('Too much missing data found')
  }

  return t('{{message}}. Total Ns: {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    message,
    total: totalMissing,
    allowed: missingDataThreshold,
    score: round(score),
  })
}
