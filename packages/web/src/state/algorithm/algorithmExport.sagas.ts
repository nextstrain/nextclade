import { call, select, takeEvery } from 'typed-redux-saga'

import {
  EXPORT_CSV_FILENAME,
  EXPORT_TSV_FILENAME,
  EXPORT_JSON_FILENAME,
  EXPORT_AUSPICE_JSON_V2_FILENAME,
} from 'src/constants'
import { saveFile } from 'src/helpers/saveFile'
import { serializeResultsToCsv, serializeResultsToJson } from 'src/io/serializeResults'

import {
  exportCsvTrigger,
  exportTsvTrigger,
  exportJsonTrigger,
  exportTreeJsonTrigger,
} from 'src/state/algorithm/algorithm.actions'

import { selectOutputTree, selectResults } from 'src/state/algorithm/algorithm.selectors'

export function* exportCsv() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToCsv, results, ';')
  saveFile(str, EXPORT_CSV_FILENAME, 'text/csv;charset=utf-8')
}

export function* exportTsv() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToCsv, results, '\t')
  saveFile(str, EXPORT_TSV_FILENAME, 'text/tab-separated-values;charset=utf-8')
}

export function* exportJson() {
  const results = yield* select(selectResults)
  const str = yield* call(serializeResultsToJson, results)
  saveFile(str, EXPORT_JSON_FILENAME, 'application/json;charset=utf-8')
}

export function* exportTreeJson() {
  const auspiceDataStr = yield* select(selectOutputTree)
  if (auspiceDataStr) {
    saveFile(auspiceDataStr, EXPORT_AUSPICE_JSON_V2_FILENAME, 'application/json;charset=utf-8')
  }
}

export default [
  takeEvery(exportCsvTrigger, exportCsv),
  takeEvery(exportTsvTrigger, exportTsv),
  takeEvery(exportJsonTrigger, exportJson),
  takeEvery(exportTreeJsonTrigger, exportTreeJson),
]
