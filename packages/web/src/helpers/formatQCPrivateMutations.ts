import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultPrivateMutations } from 'src/algorithms/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/algorithms/types'

export function formatQCPrivateMutations<TFunction extends TFunctionInterface>(
  t: TFunction,
  privateMutations?: DeepReadonly<QcResultPrivateMutations>,
) {
  if (!privateMutations || privateMutations.status === QcStatus.good) {
    return undefined
  }

  const {
    score,
    numReversionSubstitutions,
    numReversionDeletions,
    numLabeledSubstitutions,
    numLabeledDeletions,
    numUnlabeledSubstitutions,
    numUnlabeledDeletions,
    weightedTotal,
  } = privateMutations

  return t(
    'Private mutations score: {{score}}. ' +
      'Reverted substitutions: {{numReversionSubstitutions}}, ' +
      'Reverted deletions: {{numReversionDeletions}}, ' +
      'Labeled substitutions: {{numLabeledSubstitutions}}, ' +
      'Labeled deletions: {{numLabeledDeletions}}, ' +
      'Unlabeled substitutions: {{numUnlabeledSubstitutions}}, ' +
      'Unlabeled deletions: {{numUnlabeledDeletions}}. ' +
      'WeightedTotal: {{weightedTotal}}',
    {
      score: round(score),
      numReversionSubstitutions,
      numReversionDeletions,
      numLabeledSubstitutions,
      numLabeledDeletions,
      numUnlabeledSubstitutions,
      numUnlabeledDeletions,
      weightedTotal,
    },
  )
}
