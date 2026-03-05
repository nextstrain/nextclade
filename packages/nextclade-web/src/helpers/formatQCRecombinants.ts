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

  const { score, status, totalPrivateSubstitutions, totalReversionSubstitutions, totalLabeledSubstitutions } =
    recombinants

  const details: string[] = []

  if (totalReversionSubstitutions > 0) {
    details.push(t('{{count}} reversions', { count: totalReversionSubstitutions }))
  }

  if (totalLabeledSubstitutions > 0) {
    details.push(t('{{count}} labeled mutations', { count: totalLabeledSubstitutions }))
  }

  if (recombinants.spatialUniformity) {
    const cv = round(recombinants.spatialUniformity.coefficientOfVariation, 2)
    details.push(t('CV={{cv}}', { cv }))
  }

  if (recombinants.clusterGaps) {
    details.push(t('{{count}} clusters', { count: recombinants.clusterGaps.numClusters }))
  }

  if (recombinants.labelSwitching) {
    details.push(t('{{count}} label switches', { count: recombinants.labelSwitching.numSwitches }))
  }

  let message = t('Potential recombinant detected')
  if (status === 'bad') {
    message = t('Likely recombinant')
  }

  const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : ''

  return t('{{message}}{{details}}. Total private mutations: {{total}}. QC score: {{score}}', {
    message,
    details: detailsStr,
    total: totalPrivateSubstitutions,
    score: round(score, 1),
  })
}
