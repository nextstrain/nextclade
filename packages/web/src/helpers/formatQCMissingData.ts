import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'
import type { QCResultMissingData } from 'src/algorithms/QC/ruleMissingData'
import { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCMissingData<TFunction extends TFunctionInterface>(
  t: TFunction,
  missingData?: DeepReadonly<QCResultMissingData>,
) {
  if (!missingData || missingData.score === 0) {
    return undefined
  }

  const { score, totalMissing, missingDataThreshold } = missingData
  return t('Too much missing data. Total Ns: {{total}} ({{allowed}} allowed). QC score: {{score}}', {
    total: totalMissing,
    allowed: missingDataThreshold,
    score: round(score),
  })
}
