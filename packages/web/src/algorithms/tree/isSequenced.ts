import { AnalysisResultWithoutClade } from 'src/algorithms/types'

export function isSequenced(pos: number, seq: AnalysisResultWithoutClade) {
  return pos >= seq.alignmentStart && pos < seq.alignmentEnd && seq.missing.every((d) => pos < d.begin || pos >= d.end)
}
