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

  const {
    score,
    totalPrivateSubstitutions,
    totalReversionSubstitutions,
    totalLabeledSubstitutions,
    totalUnlabeledSubstitutions,
    weightedThreshold,
    multiAncestor,
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
        'Seen {{totalPrivateSubstitutions}} private mutations ({{totalReversionSubstitutions}} reversions, {{totalLabeledSubstitutions}} labeled, {{totalUnlabeledSubstitutions}} unlabeled), {{excess}} above threshold of {{threshold}}',
        {
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
        'Seen {{totalPrivateSubstitutions}} private mutations ({{totalReversionSubstitutions}} reversions, {{totalLabeledSubstitutions}} labeled, {{totalUnlabeledSubstitutions}} unlabeled)',
        {
          totalPrivateSubstitutions,
          totalReversionSubstitutions,
          totalLabeledSubstitutions,
          totalUnlabeledSubstitutions,
        },
      ),
    )
  }

  if (multiAncestor) {
    const { numAncestorSwitches, ancestorNames } = multiAncestor
    parts.push(
      t('Multi-ancestor analysis: {{numAncestorSwitches}} ancestor switches among {{numAncestors}} ancestors', {
        numAncestorSwitches,
        numAncestors: ancestorNames.length,
      }),
    )
  }

  return t('{{message}}. {{details}}. QC score: {{score}}', {
    message,
    details: parts.join('. '),
    score: round(score),
  })
}
