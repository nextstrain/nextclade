import type { QcResultFrameShifts } from 'src/algorithms/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/algorithms/types'

export function formatQCFrameShifts<TFunction extends TFunctionInterface>(
  t: TFunction,
  qcFrameShifts?: QcResultFrameShifts,
) {
  if (!qcFrameShifts || qcFrameShifts.status === QcStatus.good) {
    return undefined
  }

  const { score, frameShifts, totalFrameShifts } = qcFrameShifts

  const geneList = frameShifts.map((frameShift) => frameShift.geneName).join(', ')

  return t('{{numFrameShifts}} frame shift(s) detected. Affected gene(s): {{geneList}}. QC score: {{score}}', {
    numFrameShifts: totalFrameShifts,
    geneList,
    score,
  })
}
