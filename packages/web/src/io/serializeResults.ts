import type { StrictOmit } from 'ts-essentials'
import { omit } from 'lodash'
import jsonexport from 'jsonexport'

import type { AnalysisResult } from 'src/algorithms/types'
import type { SequenceAnalysisState } from 'src/state/algorithm/algorithm.state'
import { formatAAMutation, formatMutation } from 'src/helpers/formatMutation'
import { formatRange } from 'src/helpers/formatRange'
import { formatInsertion } from 'src/helpers/formatInsertion'
import { formatNonAcgtn } from 'src/helpers/formatNonAcgtn'
import { formatPrimer } from 'src/helpers/formatPrimer'
import { formatSnpCluster } from 'src/helpers/formatSnpCluster'

const CSV_EOL = '\r\n'

export type AnalysisResultWithErrors = AnalysisResult & { errors: string[] }
export type Exportable = StrictOmit<AnalysisResult, 'alignedQuery' | 'nucleotideComposition'>

export function prepareResultJson(result: AnalysisResultWithErrors): Exportable {
  return omit(result, ['alignedQuery', 'nucleotideComposition'])
}

export function prepareResultsJson(results: SequenceAnalysisState[]) {
  return results.map(({ seqName, status, errors, result }) => {
    if (!result) {
      return { seqName, errors }
    }

    return prepareResultJson({ ...result, errors: [] })
  })
}

export function serializeResultsToJson(results: SequenceAnalysisState[]) {
  const data = prepareResultsJson(results)
  const str = JSON.stringify(data, null, 2)
  return `${str}\n`
}

export function prepareResultCsv(datum: Exportable) {
  return {
    ...datum,
    qc: {
      ...datum.qc,
      snpClusters: {
        ...(datum.qc?.snpClusters ?? {}),
        clusteredSNPs: datum.qc?.snpClusters?.clusteredSNPs.map(formatSnpCluster).join(','),
      },
    },
    substitutions: datum.substitutions.map((mut) => formatMutation(mut)).join(','),
    aminoacidChanges: datum.aminoacidChanges.map((mut) => formatAAMutation(mut)).join(','),
    deletions: datum.deletions.map(({ start, length }) => formatRange(start, start + length)).join(','),
    insertions: datum.insertions.map((ins) => formatInsertion(ins)).join(','),
    missing: datum.missing.map(({ begin, end }) => formatRange(begin, end)).join(','),
    nonACGTNs: datum.nonACGTNs.map((nacgtn) => formatNonAcgtn(nacgtn)).join(','),
    pcrPrimerChanges: datum.pcrPrimerChanges.map(formatPrimer).join(','),
  }
}

export function prepareResultCsvCladesOnly(datum: Exportable) {
  const { seqName, clade } = datum
  return { seqName, clade }
}

export async function toCsvString(data: Array<unknown> | Record<string, unknown>, delimiter: string) {
  const csv = await jsonexport(data, { rowDelimiter: delimiter, endOfLine: CSV_EOL })
  return `${csv}${CSV_EOL}`
}

export async function serializeResultsToCsv(results: SequenceAnalysisState[], delimiter: string) {
  const data = results.map(({ seqName, status, errors, result }) => {
    if (!result) {
      return { seqName, errors: errors.map((e) => `"${e}"`).join(',') }
    }

    const datum = prepareResultJson({ ...result, errors: [] })
    return prepareResultCsv(datum)
  })

  return toCsvString(data, delimiter)
}
