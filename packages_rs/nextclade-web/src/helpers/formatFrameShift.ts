import type { FrameShift } from 'src/types'
import { formatRange } from 'src/helpers/formatRange'

export function formatFrameShift({ geneName, codon }: FrameShift) {
  return `${geneName}:${formatRange(codon)}`
}
