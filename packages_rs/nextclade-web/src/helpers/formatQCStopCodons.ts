import { uniq } from 'lodash'

import type { QcResultStopCodons } from 'src/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'

export function formatQCStopCodons<TFunction extends TFunctionInterface>(
  t: TFunction,
  qcStopCodons?: QcResultStopCodons,
) {
  if (!qcStopCodons || qcStopCodons.status === 'good') {
    return undefined
  }

  const { score, stopCodons, totalStopCodons } = qcStopCodons

  const geneList = uniq(stopCodons.map((sc) => sc.geneName)).join(', ')

  return t(
    '{{totalStopCodons}} misplaced stop codon(s) detected. Affected gene(s): {{geneList}}. QC score: {{score}}',
    {
      totalStopCodons,
      geneList,
      score,
    },
  )
}
