import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultPrivateMutations } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/types'

export function formatQCPrivateMutations<TFunction extends TFunctionInterface>(
  t: TFunction,
  privateMutations?: DeepReadonly<QcResultPrivateMutations>,
) {
  if (!privateMutations || privateMutations.status === 'good') {
    return undefined
  }

  const {
    score,
    numReversionSubstitutions,
    numLabeledSubstitutions,
    numUnlabeledSubstitutions,
    totalDeletionRanges,
    weightedTotal,
  } = privateMutations

  return t(
    'QC score: {{score}}. ' +
      'Reverted substitutions: {{numReversionSubstitutions}}, ' +
      'Labeled substitutions: {{numLabeledSubstitutions}}, ' +
      'Unlabeled substitutions: {{numUnlabeledSubstitutions}}, ' +
      'Deletion ranges: {{totalDeletionRanges}}. ' +
      'Weighted total: {{weightedTotal}}',
    {
      score: round(score),
      numReversionSubstitutions,
      numLabeledSubstitutions,
      numUnlabeledSubstitutions,
      totalDeletionRanges,
      weightedTotal,
    },
  )
}
