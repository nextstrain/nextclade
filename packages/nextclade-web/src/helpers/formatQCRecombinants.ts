import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultRecombinants } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCRecombinants<TFunction extends TFunctionInterface>(
  t: TFunction,
  recombinants?: DeepReadonly<QcResultRecombinants>,
) {
  if (!recombinants || recombinants.status === 'good') {
    return undefined
  }

  const { score, totalPrivateMutations, totalReversionSubstitutions, mutationsThreshold, excessMutations, status } =
    recombinants

  const totalMutations = totalPrivateMutations + totalReversionSubstitutions

  let message = t('Potentially recombinant sequence detected')
  if (status === 'bad') {
    message = t('Likely recombinant sequence detected')
  }

  return t(
    '{{message}}. Seen {{totalMutations}} private mutations and reversions ({{excessMutations}} above threshold of {{mutationsThreshold}}). QC score: {{score}}',
    {
      message,
      totalMutations,
      excessMutations,
      mutationsThreshold,
      score: round(score),
    },
  )
}
