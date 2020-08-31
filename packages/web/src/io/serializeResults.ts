import { omit } from 'lodash'
import jsonexport from 'jsonexport'

import { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { formatAAMutation, formatMutation } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { formatInsertion } from 'src/helpers/formatInsertion'

export function prepareResultsJson(results: SequenceAnalysisState[]) {
  return results.map(({ seqName, status, errors, result, qc }) => {
    if (!result || !qc) {
      return { seqName, errors }
    }
    return omit({ ...result, ...qc }, ['alignedQuery'])
  })
}

export function serializeResultsToJson(results: SequenceAnalysisState[]) {
  const data = prepareResultsJson(results)
  return JSON.stringify(data, null, 2)
}

export async function serializeResultsToCsv(results: SequenceAnalysisState[], delimiter: string) {
  const data = results.map(({ seqName, status, errors, result, qc }) => {
    if (!result) {
      return { seqName, errors: errors.map((e) => `"${e}"`).join(',') }
    }

    const datum = omit({ ...result, ...qc }, ['alignedQuery'])

    return {
      ...datum,
      substitutions: datum.substitutions.map((mut) => formatMutation(mut)).join(','),
      aminoacidChanges: datum.aminoacidChanges.map((mut) => formatAAMutation(mut)).join(','),
      deletions: datum.deletions.map(({ start, length }) => formatRange(start, start + length)).join(','),
      insertions: datum.insertions.map((ins) => formatInsertion(ins)).join(','),
      missing: datum.missing.map(({ begin, end }) => formatRange(begin, end)).join(','),
    }
  })

  return jsonexport(data, { rowDelimiter: delimiter, endOfLine: '\r\n' })
}
