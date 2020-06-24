import type { AnalysisResult } from 'src/algorithms/types'

export function serializeResults(results: AnalysisResult[]) {
  return JSON.stringify(results, null, 2)
}
