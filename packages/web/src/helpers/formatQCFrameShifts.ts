import type { QcResultFrameShifts } from 'src/algorithms/types'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { QcStatus } from 'src/algorithms/types'

export function formatQCFrameShifts<TFunction extends TFunctionInterface>(
  t: TFunction,
  frameShifts?: QcResultFrameShifts,
) {
  if (!frameShifts || frameShifts.status === QcStatus.good) {
    return undefined
  }

  const { score, totalFrameShifts } = frameShifts

  return t('{{numFrameShifts}} frame shift(s) detected. QC score: {{score}}', {
    numFrameShifts: totalFrameShifts,
    score,
  })
}
