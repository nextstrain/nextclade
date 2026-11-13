import { round } from 'lodash'

import type { DeepReadonly } from 'ts-essentials'

import type { QcResultPrivateMutations } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

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
    excess,
    cutoff,
    lengthScaling,
  } = privateMutations

  const counts = t(
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

  if (!lengthScaling) {
    return counts
  }

  const scaling = t('Thresholds scaled to {{length}} nucleotides: typical {{typical}}, cutoff {{cutoff}}', {
    length: lengthScaling.length,
    typical: round(weightedTotal - excess, 1),
    cutoff: round(cutoff * lengthScaling.factor, 1),
  })
  return `${counts}. ${scaling}`
}
