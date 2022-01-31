import type { FrameShift } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'

export function formatFrameShift(frameShift: FrameShift) {
  const { geneName, codon } = frameShift
  const { begin, end } = codon
  return `${geneName}:${formatRange(begin, end)}`
}
