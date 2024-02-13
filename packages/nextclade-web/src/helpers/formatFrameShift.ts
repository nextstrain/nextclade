import type { FrameShift } from 'src/types'
import { formatRange } from 'src/helpers/formatRange'

export function formatFrameShift({ cdsName, codon }: FrameShift) {
  return `${cdsName}:${formatRange(codon)}`
}
