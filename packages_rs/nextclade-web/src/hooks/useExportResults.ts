/* eslint-disable no-void,unicorn/no-await-expression-member,no-loops/no-loops */
import { isEmpty, isNil } from 'lodash'
import { useState } from 'react'
import { Snapshot, useRecoilCallback, useRecoilValue } from 'recoil'
import type { AnalysisError, AnalysisOutput } from 'src/types'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { saveFile, saveZip, ZipFileDescription } from 'src/helpers/saveFile'
import { globalErrorAtom } from 'src/state/error.state'
import {
  aaMotifsDescsAtom,
  analysisResultsAtom,
  cdsesAtom,
  cladeNodeAttrDescsAtom,
  csvColumnConfigAtom,
  phenotypeAttrDescsAtom,
  treeAtom,
  treeNwkAtom,
} from 'src/state/results.state'
import { ExportWorker } from 'src/workers/ExportThread'

const PACKAGE_VERSION = process.env.PACKAGE_VERSION ?? 'unknown'

export interface ExportParams {
  filenameZip: string
  filenameCsv: string
  filenameTsv: string
  filenameJson: string
  filenameNdjson: string
  filenameTree: string
  filenameTreeNwk: string
  filenameFasta: string
  filenamePeptidesZip: string
  filenamePeptidesTemplate: string
}

export const DEFAULT_EXPORT_PARAMS: ExportParams = {
  filenameZip: 'nextclade.zip',
  filenameCsv: 'nextclade.csv',
  filenameTsv: 'nextclade.tsv',
  filenameJson: 'nextclade.json',
  filenameNdjson: 'nextclade.ndjson',
  filenameTree: 'nextclade.auspice.json',
  filenameTreeNwk: 'nextclade.nwk',
  filenameFasta: 'nextclade.aligned.fasta',
  filenamePeptidesZip: 'nextclade.peptides.fasta.zip',
  filenamePeptidesTemplate: 'nextclade.cds_translation.{{cds}}.fasta',
}

function useResultsExport(exportFn: (filename: string, snapshot: Snapshot, worker: ExportWorker) => Promise<void>) {
  const [isRunning, setIsRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const fn = useRecoilCallback(
    ({ set, snapshot }) => {
      const snapshotRelease = snapshot.retain()
      return (filename: string) => {
        setIsRunning(true)
        void ExportWorker.get()
          .then(async (worker) => {
            const result = await exportFn(filename, snapshot, worker)
            setIsDone(true)
            return result
          })
          .catch((error) => {
            set(globalErrorAtom, error)
          })
          .finally(() => {
            snapshotRelease()
            setIsRunning(false)
          })
      }
    },
    [exportFn, setIsRunning],
  )
  return { isRunning, isDone, fn }
}

async function mapGoodResults<T>(snapshot: Snapshot, mapFn: (result: AnalysisOutput) => T) {
  const results = await snapshot.getPromise(analysisResultsAtom)

  return results
    .filter((result) => notUndefinedOrNull(result.result))
    .map((result) => {
      if (!result.result) {
        throw new ErrorInternal('When preparing analysis results for export: expected result to be non-nil')
      }
      return mapFn(result.result)
    })
}

async function mapErrors<T>(snapshot: Snapshot, mapFn: (result: AnalysisError) => T) {
  const results = await snapshot.getPromise(analysisResultsAtom)

  return results
    .filter((result) => notUndefinedOrNull(result.error))
    .map(({ error, seqName, index }) => {
      if (!error) {
        throw new ErrorInternal('When preparing analysis errors for export: expected error to be non-nil')
      }
      return mapFn({ index, seqName, errors: [error] })
    })
}

async function prepareOutputFasta(snapshot: Snapshot) {
  let fastaStr = (
    await mapGoodResults(snapshot, (result) => `>${result.analysisResult.seqName}\n${result.query}`)
  ).join('\n')
  fastaStr += '\n'
  return fastaStr
}

export function useExportFasta() {
  return useResultsExport(async (filename, snapshot) => {
    const fastaStr = await prepareOutputFasta(snapshot)
    saveFile(fastaStr, filename, 'application/x-fasta;charset=utf-8')
  })
}

async function prepareResultsCsv(snapshot: Snapshot, worker: ExportWorker, delimiter: string) {
  const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, (err) => err)
  const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom)
  const phenotypeAttrDescs = await snapshot.getPromise(phenotypeAttrDescsAtom)
  const aaMotifsDescs = await snapshot.getPromise(aaMotifsDescsAtom)
  const csvColumnConfig = await snapshot.getPromise(csvColumnConfigAtom)
  if (!csvColumnConfig) {
    throw new ErrorInternal('CSV column config is not initialized, but it should be')
  }

  return worker.serializeResultsCsv(
    results,
    errors,
    cladeNodeAttrDescs,
    phenotypeAttrDescs,
    aaMotifsDescs,
    delimiter,
    csvColumnConfig,
  )
}

export function useExportCsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsCsv(snapshot, worker, ';')
    saveFile(csvStr, filename, 'text/csv;charset=utf-8')
  })
}

export function useExportTsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const tsvStr = await prepareResultsCsv(snapshot, worker, '\t')
    saveFile(tsvStr, filename, 'text/tab-separated-values;charset=utf-8')
  })
}

async function prepareResultsJson(snapshot: Snapshot, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, (err) => err)
  const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom)
  const phenotypeAttrDescs = await snapshot.getPromise(phenotypeAttrDescsAtom)
  return worker.serializeResultsJson(results, errors, cladeNodeAttrDescs, phenotypeAttrDescs, PACKAGE_VERSION)
}

export function useExportJson() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const jsonStr = await prepareResultsJson(snapshot, worker)
    saveFile(jsonStr, filename, 'application/json;charset=utf-8')
  })
}

async function prepareResultsNdjson(snapshot: Snapshot, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, (err) => err)
  return worker.serializeResultsNdjson(results, errors)
}

export function useExportNdjson() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const ndjsonStr = await prepareResultsNdjson(snapshot, worker)
    saveFile(ndjsonStr, filename, 'application/x-ndjson;charset=utf-8')
  })
}

async function prepareOutputTree(snapshot: Snapshot) {
  const tree = await snapshot.getPromise(treeAtom)
  if (!tree) {
    return undefined
  }
  return JSON.stringify(tree, null, 2)
}

export function useExportTree() {
  const tree = useRecoilValue(treeAtom)
  const res = useResultsExport(async (filename, snapshot) => {
    const jsonStr = await prepareOutputTree(snapshot)
    if (isNil(jsonStr)) {
      return
    }
    saveFile(jsonStr, filename, 'application/json;charset=utf-8')
  })
  if (isNil(tree)) {
    return undefined
  }
  return res
}

export async function prepareOutputTreeNwk(snapshot: Snapshot) {
  const treeNwk = await snapshot.getPromise(treeNwkAtom)
  if (!treeNwk) {
    return undefined
  }
  return treeNwk
}

export function useExportTreeNwk() {
  const tree = useRecoilValue(treeNwkAtom)

  const res = useResultsExport(async (filename, snapshot, _) => {
    const nwk = await prepareOutputTreeNwk(snapshot)
    if (isNil(nwk)) {
      return
    }
    saveFile(nwk, filename, 'text/x-nh;charset=utf-8')
  })

  if (isNil(tree)) {
    return undefined
  }
  return res
}

async function preparePeptideFiles(snapshot: Snapshot) {
  const peptides = await mapGoodResults(snapshot, ({ translation, analysisResult: { seqName } }) => ({
    seqName,
    translation,
  }))

  const filesMap = new Map<string, ZipFileDescription>()

  for (const { seqName, translation } of peptides) {
    for (const [_, { cdses }] of Object.entries(translation.genes)) {
      for (const [_, { name, seq }] of Object.entries(cdses)) {
        const file = filesMap.get(name)
        const fastaEntry = `>${seqName}\n${seq}\n`
        if (file) {
          file.data = `${file.data}${fastaEntry}`
        } else {
          let filename = DEFAULT_EXPORT_PARAMS.filenamePeptidesTemplate
          filename = filename.replace('{{cds}}', name)
          filesMap.set(name, { filename, data: fastaEntry })
        }
      }
    }
  }

  return Array.from(filesMap.values())
}

export function useExportPeptides() {
  const cdses = useRecoilValue(cdsesAtom)

  const res = useResultsExport(async (filename, snapshot) => {
    const files = await preparePeptideFiles(snapshot)
    await saveZip({ files, filename })
  })

  if (isEmpty(cdses)) {
    return undefined
  }

  return res
}

export function useExportZip() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsCsv(snapshot, worker, ';')
    const tsvStr = await prepareResultsCsv(snapshot, worker, '\t')
    const jsonStr = await prepareResultsJson(snapshot, worker)
    const ndjsonStr = await prepareResultsNdjson(snapshot, worker)
    const treeJsonStr = await prepareOutputTree(snapshot)
    const treeNwkStr = await prepareOutputTreeNwk(snapshot)
    const fastaStr = await prepareOutputFasta(snapshot)
    const peptideFiles = await preparePeptideFiles(snapshot)

    const files: ZipFileDescription[] = [
      ...(peptideFiles ?? []),
      { filename: DEFAULT_EXPORT_PARAMS.filenameCsv, data: csvStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameTsv, data: tsvStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameJson, data: jsonStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameNdjson, data: ndjsonStr },
      { filename: DEFAULT_EXPORT_PARAMS.filenameFasta, data: fastaStr },
    ]

    if (treeJsonStr) {
      files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameTree, data: treeJsonStr })
    }

    if (treeNwkStr) {
      files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameTreeNwk, data: treeNwkStr })
    }

    await saveZip({ filename, files })
  })
}
