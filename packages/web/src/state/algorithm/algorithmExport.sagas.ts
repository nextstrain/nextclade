/* eslint-disable no-loops/no-loops,no-continue */
import { call, select, takeEvery } from 'typed-redux-saga'

import type { ZipFileDescription } from 'src/helpers/saveFile'

import { saveFile, saveZip } from 'src/helpers/saveFile'
import { serializeResults, serializeResultsToJson } from 'src/io/serializeResults'
import {
  exportAll,
  exportCsvTrigger,
  exportFastaTrigger,
  exportJsonTrigger,
  exportPeptides,
  exportTreeJsonTrigger,
  exportTsvTrigger,
} from 'src/state/algorithm/algorithm.actions'
import {
  selectExportParams,
  selectOutputPeptides,
  selectOutputSequences,
  selectOutputTree,
  selectResults,
  selectResultsArray,
} from 'src/state/algorithm/algorithm.selectors'
import fsaSaga from 'src/state/util/fsaSaga'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { serializeToCsv } from 'src/workers/run'

export function* prepareResultsCsvStr() {
  const results = yield* select(selectResultsArray)
  const resultsGood = results.filter(notUndefinedOrNull)
  const resultsGoodStr = serializeResults(resultsGood)
  return yield* call(serializeToCsv, resultsGoodStr, ';')
}

export function* exportCsv() {
  const exportParams = yield* select(selectExportParams)
  const csvStr = yield* prepareResultsCsvStr()
  saveFile(csvStr, exportParams.filenameCsv, 'text/csv;charset=utf-8')
}

export function* prepareResultsTsvStr() {
  const results = yield* select(selectResultsArray)
  const resultsGood = results.filter(notUndefinedOrNull)
  const resultsGoodStr = serializeResults(resultsGood)
  return yield* call(serializeToCsv, resultsGoodStr, '\t')
}

export function* exportTsv() {
  const exportParams = yield* select(selectExportParams)
  const tsvStr = yield* prepareResultsTsvStr()
  saveFile(tsvStr, exportParams.filenameTsv, 'text/tab-separated-values;charset=utf-8')
}

export function* prepareResultsJsonStr() {
  const results = yield* select(selectResults)
  return yield* call(serializeResultsToJson, results)
}

export function* exportJson() {
  const exportParams = yield* select(selectExportParams)
  const jsonStr = yield* prepareResultsJsonStr()
  saveFile(jsonStr, exportParams.filenameJson, 'application/json;charset=utf-8')
}

export function* prepareResultTreeJsonStr() {
  const treeStr = yield* select(selectOutputTree)
  if (!treeStr) {
    throw new Error(
      'When preparing tree JSON for download: Unable to find the tree data. This is an internal error. Please report it to developers.',
    )
  }
  return treeStr
}

export function* exportTreeJson() {
  const exportParams = yield* select(selectExportParams)
  const treeStr = yield* prepareResultTreeJsonStr()
  saveFile(treeStr, exportParams.filenameTreeJson, 'application/json;charset=utf-8')
}

export function* prepareResultFastaStr() {
  const sequences = (yield* select(selectOutputSequences)).filter((seq) => notUndefinedOrNull(seq.query))
  return sequences.reduce((res, { seqName, query }) => {
    if (!query) {
      return res
    }
    return `${res}>${seqName}\n${query}\n`
  }, '')
}

export function* exportFasta() {
  const exportParams = yield* select(selectExportParams)
  const fastaStr = yield* prepareResultFastaStr()
  saveFile(fastaStr, exportParams.filenameFasta, 'application/x-fasta;charset=utf-8')
}

export function* prepareResultPeptideFiles() {
  const exportParams = yield* select(selectExportParams)
  const peptides = (yield* select(selectOutputPeptides)).filter((peptide) => peptide.queryPeptides)

  const files = new Map<string, ZipFileDescription>()

  for (const { seqName, queryPeptides } of peptides) {
    if (!queryPeptides) {
      continue
    }

    for (const { name: geneName, seq } of queryPeptides) {
      const file = files.get(geneName)
      const fastaEntry = `>${seqName}\n${seq}\n`
      if (file) {
        file.data = `${file.data}${fastaEntry}`
      } else {
        let filename = exportParams.filenamePeptidesTemplate
        filename = filename.replace('{{GENE}}', geneName)
        files.set(geneName, { filename, data: fastaEntry })
      }
    }
  }

  return Array.from(files.values())
}

export function* exportPeptidesWorker() {
  const exportParams = yield* select(selectExportParams)
  const files = yield* prepareResultPeptideFiles()
  yield* call(saveZip, { files, filename: exportParams.filenamePeptidesZip })
}

export function* exportAllWorker() {
  const exportParams = yield* select(selectExportParams)

  const csvStr = yield* prepareResultsCsvStr()
  const tsvStr = yield* prepareResultsTsvStr()
  const jsonStr = yield* prepareResultsJsonStr()
  const treeJsonStr = yield* prepareResultTreeJsonStr()
  const fastaStr = yield* prepareResultFastaStr()

  const peptideFiles = yield* prepareResultPeptideFiles()

  const allFiles: ZipFileDescription[] = [
    ...peptideFiles,
    { filename: exportParams.filenameCsv, data: csvStr },
    { filename: exportParams.filenameTsv, data: tsvStr },
    { filename: exportParams.filenameJson, data: jsonStr },
    { filename: exportParams.filenameTreeJson, data: treeJsonStr },
    { filename: exportParams.filenameFasta, data: fastaStr },
  ]

  yield* call(saveZip, { files: allFiles, filename: exportParams.filenameZip })
}

export default [
  takeEvery(exportCsvTrigger, exportCsv),
  takeEvery(exportTsvTrigger, exportTsv),
  takeEvery(exportJsonTrigger, exportJson),
  takeEvery(exportTreeJsonTrigger, exportTreeJson),
  takeEvery(exportFastaTrigger, exportFasta),
  takeEvery(exportPeptides.trigger, fsaSaga(exportPeptides, exportPeptidesWorker)),
  takeEvery(exportAll.trigger, fsaSaga(exportAll, exportAllWorker)),
]
