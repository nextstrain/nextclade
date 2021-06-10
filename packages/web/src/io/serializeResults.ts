import type { StrictOmit } from 'ts-essentials'

import type { AnalysisResult } from 'src/algorithms/types'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export type AnalysisResultWithErrors = AnalysisResult & { errors: string[] }

export interface Exportable extends StrictOmit<AnalysisResult, 'alignedQuery' | 'nucleotideComposition'> {
  errors: string
}

export function serializeResults(analysisResults: AnalysisResult[]) {
  // eslint-disable-next-line prefer-destructuring
  const PACKAGE_VERSION = process.env.PACKAGE_VERSION

  const finalResult = {
    schemaVersion: '1.0.0',
    nextcladeVersion: PACKAGE_VERSION,
    timestamp: Math.floor(Date.now() / 1000),
    results: analysisResults,
  }

  return JSON.stringify(finalResult, null, 2)
}

export function prepareResultsJson(results: SequenceAnalysisState[]) {
  return results
    .map(({ result }) => {
      if (!result) {
        return undefined
      }
      return result
    })
    .filter(notUndefinedOrNull)
}

export function serializeResultsToJson(results: SequenceAnalysisState[]) {
  const data = prepareResultsJson(results)
  const str = serializeResults(data)
  return `${str}\n`
}
