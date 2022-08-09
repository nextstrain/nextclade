import type { QcResultCoverage } from 'src/algorithms/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/algorithms/types'

export function formatQCCoverage<TFunction extends TFunctionInterface>(t: TFunction, qcCoverage?: QcResultCoverage) {
  if (!qcCoverage || qcCoverage.status === QcStatus.good) {
    return undefined
  }

  const { score, coverage } = qcCoverage

  return t('Coverage is low: {{coverage}}. QC score: {{score}}', {
    coverage,
    score,
  })
}
