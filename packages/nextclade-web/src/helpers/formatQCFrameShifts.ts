import type { QcResultFrameShifts } from 'src/types'
import { notUndefined } from 'src/helpers/notUndefined'
import type { TFunctionInterface } from 'src/helpers/TFunctionInterface'
import { formatFrameShift } from 'src/helpers/formatFrameShift'

export function formatQCFrameShifts<TFunction extends TFunctionInterface>(
  t: TFunction,
  qcFrameShifts?: QcResultFrameShifts,
) {
  if (!qcFrameShifts) {
    return undefined
  }

  const { score, frameShifts, totalFrameShifts, frameShiftsIgnored, totalFrameShiftsIgnored } = qcFrameShifts

  const frameShiftsList = frameShifts.map((frameShift) => formatFrameShift(frameShift)).join(', ')
  const frameShiftsIgnoredList = frameShiftsIgnored.map((frameShift) => formatFrameShift(frameShift)).join(', ')

  let unexpected: string | undefined
  if (frameShiftsList.length > 0) {
    unexpected = t('Unexpected {{numFrameShifts}} frame shift(s) detected: {{frameShiftsList}}', {
      numFrameShifts: totalFrameShifts,
      frameShiftsList,
    })
  }

  let ignored: string | undefined
  if (frameShiftsIgnoredList.length > 0) {
    ignored = t('Ignored {{numIgnored}} known frame shift(s): {{frameShiftsIgnoredList}}', {
      numIgnored: totalFrameShiftsIgnored,
      frameShiftsIgnoredList,
    })
  }

  let scoreStr: string | undefined
  if (unexpected || ignored) {
    scoreStr = t('QC score: {{score}}', { score })
  }

  return [unexpected, ignored, scoreStr].filter(notUndefined).join('. ')
}
