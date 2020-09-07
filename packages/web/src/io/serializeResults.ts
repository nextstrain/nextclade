import { omit } from 'lodash'
import jsonexport from 'jsonexport'

import type { AnalysisResult } from 'src/algorithms/types'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { formatAAMutation, formatMutation } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { formatInsertion } from 'src/helpers/formatInsertion'
import { formatNonAcgtn } from 'src/helpers/formatNonAcgtn'
import { StrictOmit } from 'ts-essentials'

export type Exportable = StrictOmit<AnalysisResult, 'alignedQuery'>

export function prepareResultJson(result: AnalysisResult): Exportable {
  return omit(result, ['alignedQuery'])
}

export function prepareResultsJson(results: SequenceAnalysisState[]) {
  return results.map(({ seqName, status, errors, result, qc }) => {
    if (!result || !qc || !result.clade) {
      return { seqName, errors }
    }

    return prepareResultJson({ ...result, clade: result.clade, qc })
  })
}

export function serializeResultsToJson(results: SequenceAnalysisState[]) {
  const data = prepareResultsJson(results)
  return JSON.stringify(data, null, 2)
}

export function prepareResultCsv(datum: Exportable) {
  return {
    ...datum,
    substitutions: datum.substitutions.map((mut) => formatMutation(mut)).join(','),
    aminoacidChanges: datum.aminoacidChanges.map((mut) => formatAAMutation(mut)).join(','),
    deletions: datum.deletions.map(({ start, length }) => formatRange(start, start + length)).join(','),
    insertions: datum.insertions.map((ins) => formatInsertion(ins)).join(','),
    missing: datum.missing.map(({ begin, end }) => formatRange(begin, end)).join(','),
    nonACGTNs: datum.nonACGTNs.map((nacgtn) => formatNonAcgtn(nacgtn)).join(','),
  }
}

export async function toCsvString(data: Array<unknown> | Record<string, unknown>, delimiter: string) {
  return jsonexport(data, { rowDelimiter: delimiter, endOfLine: '\r\n' })
}

export async function serializeResultsToCsv(results: SequenceAnalysisState[], delimiter: string) {
  const data = results.map(({ seqName, status, errors, result, qc }) => {
    if (!result || !qc || !result.clade) {
      return { seqName, errors: errors.map((e) => `"${e}"`).join(',') }
    }

    const datum = prepareResultJson({ ...result, clade: result.clade, qc })
    return prepareResultCsv(datum)
  })

  return toCsvString(data, delimiter)
}
