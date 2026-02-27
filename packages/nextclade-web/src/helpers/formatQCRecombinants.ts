import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultRecombinants, RecombResultLabelSwitching } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

function formatLabelSwitching<TFunction extends TFunctionInterface>(
  t: TFunction,
  labelSwitching: DeepReadonly<RecombResultLabelSwitching>,
): string {
  const { numLabels, numSwitches, labelSegments } = labelSwitching

  const labelList = Object.entries(labelSegments)
    .map(([label, count]) => `${label}(${count})`)
    .join(', ')

  return t('Label switching: {{numLabels}} labels ({{labelList}}), {{numSwitches}} switches', {
    numLabels,
    labelList,
    numSwitches,
  })
}

export function formatQCRecombinants<TFunction extends TFunctionInterface>(
  t: TFunction,
  recombinants?: DeepReadonly<QcResultRecombinants>,
) {
  if (!recombinants || recombinants.status === 'good') {
    return undefined
  }

  const {
    score,
    totalPrivateSubstitutions,
    totalReversionSubstitutions,
    totalLabeledSubstitutions,
    totalUnlabeledSubstitutions,
    weightedThreshold,
    labelSwitching,
    status,
  } = recombinants

  let message = t('Potentially recombinant sequence detected')
  if (status === 'bad') {
    message = t('Likely recombinant sequence detected')
  }

  const parts: string[] = []

  if (weightedThreshold) {
    const { threshold, excess } = weightedThreshold
    parts.push(
      t(
        '{{message}}. Seen {{totalPrivateSubstitutions}} private mutations ({{totalReversionSubstitutions}} reversions, {{totalLabeledSubstitutions}} labeled, {{totalUnlabeledSubstitutions}} unlabeled), {{excess}} above threshold of {{threshold}}',
        {
          message,
          totalPrivateSubstitutions,
          totalReversionSubstitutions,
          totalLabeledSubstitutions,
          totalUnlabeledSubstitutions,
          excess: round(excess),
          threshold,
        },
      ),
    )
  } else {
    parts.push(
      t(
        '{{message}}. Seen {{totalPrivateSubstitutions}} private mutations ({{totalReversionSubstitutions}} reversions, {{totalLabeledSubstitutions}} labeled, {{totalUnlabeledSubstitutions}} unlabeled)',
        {
          message,
          totalPrivateSubstitutions,
          totalReversionSubstitutions,
          totalLabeledSubstitutions,
          totalUnlabeledSubstitutions,
        },
      ),
    )
  }

  if (labelSwitching && labelSwitching.numSwitches > 0) {
    parts.push(formatLabelSwitching(t, labelSwitching))
  }

  parts.push(t('QC score: {{score}}', { score: round(score) }))

  return parts.join('. ')
}
