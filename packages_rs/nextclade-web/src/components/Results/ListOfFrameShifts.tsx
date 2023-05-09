import React from 'react'

import type { FrameShift, QcResultFrameShifts } from 'src/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { formatFrameShift } from 'src/helpers/formatFrameShift'

export interface FrameShiftRowsProps {
  frameShifts: FrameShift[]
}

export function FrameShiftRows({ frameShifts }: FrameShiftRowsProps) {
  return (
    <ul>
      {frameShifts.map((fs) => (
        <li key={`${fs.geneName}_${fs.codon.begin}`}>{formatFrameShift(fs)}</li>
      ))}
    </ul>
  )
}

export interface ListOfFrameShiftsProps {
  frameShiftsResults: QcResultFrameShifts
}

export function ListOfFrameShifts({ frameShiftsResults }: ListOfFrameShiftsProps) {
  const { t } = useTranslationSafe()

  const { frameShifts, frameShiftsIgnored, totalFrameShifts, totalFrameShiftsIgnored } = frameShiftsResults

  return (
    <>
      <h6>{t('Unexpected frame shifts ({{ n }})', { n: totalFrameShifts })}</h6>
      <FrameShiftRows frameShifts={frameShifts} />

      <h6>{t('Known frame shifts ({{ n }})', { n: totalFrameShiftsIgnored })}</h6>
      <FrameShiftRows frameShifts={frameShiftsIgnored} />
    </>
  )
}
