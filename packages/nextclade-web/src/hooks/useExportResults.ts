/* eslint-disable no-void,no-loops/no-loops */
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
  refNodesAtom,
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
  filenameGff: string
  filenameTbl: string
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
  filenameGff: 'nextclade.gff',
  filenameTbl: 'nextclade.tbl',
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

async function mapGoodResults<T>(snapshot: Snapshot, datasetName: string, mapFn: (result: AnalysisOutput) => T) {
  const results = (await snapshot.getPromise(analysisResultsAtom)).filter(
    (result) => result.result?.analysisResult.datasetName === datasetName,
  )

  return results
    .filter((result) => notUndefinedOrNull(result.result))
    .map((result) => {
      if (!result.result) {
        throw new ErrorInternal('When preparing analysis results for export: expected result to be non-nil')
      }
      return mapFn(result.result)
    })
}

async function mapErrors<T>(snapshot: Snapshot, datasetName: string, mapFn: (result: AnalysisError) => T) {
  const results = (await snapshot.getPromise(analysisResultsAtom)).filter(
    (result) => result.result?.analysisResult.datasetName === datasetName,
  )

  return results
    .filter((result) => notUndefinedOrNull(result.error))
    .map(({ error, seqName, index }) => {
      if (!error) {
        throw new ErrorInternal('When preparing analysis errors for export: expected error to be non-nil')
      }
      return mapFn({ index, seqName, errors: [error] })
    })
}

async function prepareOutputFasta(snapshot: Snapshot, datasetName: string) {
  let fastaStr = (
    await mapGoodResults(snapshot, datasetName, (result) => `>${result.analysisResult.seqName}\n${result.query}`)
  ).join('\n')
  fastaStr += '\n'
  return fastaStr
}

export function useExportFasta({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot) => {
    const fastaStr = await prepareOutputFasta(snapshot, datasetName)
    saveFile(fastaStr, filename, 'application/x-fasta;charset=utf-8')
  })
}

async function prepareResultsCsv(snapshot: Snapshot, datasetName: string, worker: ExportWorker, delimiter: string) {
  const results = await mapGoodResults(snapshot, datasetName, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, datasetName, (err) => err)

  const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom({ datasetName }))
  const phenotypeAttrDescs = await snapshot.getPromise(phenotypeAttrDescsAtom({ datasetName }))
  const refNodes = await snapshot.getPromise(refNodesAtom({ datasetName }))
  const aaMotifsDescs = await snapshot.getPromise(aaMotifsDescsAtom({ datasetName }))
  const csvColumnConfig = await snapshot.getPromise(csvColumnConfigAtom)
  if (!csvColumnConfig) {
    throw new ErrorInternal('CSV column config is not initialized, but it should be')
  }

  return worker.serializeResultsCsv(
    results,
    errors,
    cladeNodeAttrDescs ?? [],
    phenotypeAttrDescs ?? [],
    refNodes ?? {},
    aaMotifsDescs ?? [],
    delimiter,
    csvColumnConfig,
  )
}

export function useExportCsv({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsCsv(snapshot, datasetName, worker, ';')
    saveFile(csvStr, filename, 'text/csv;charset=utf-8')
  })
}

export function useExportTsv({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot, worker) => {
    const tsvStr = await prepareResultsCsv(snapshot, datasetName, worker, '\t')
    saveFile(tsvStr, filename, 'text/tab-separated-values;charset=utf-8')
  })
}

async function prepareResultsJson(snapshot: Snapshot, datasetName: string, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, datasetName, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, datasetName, (err) => err)

  const cladeNodeAttrDescs = (await snapshot.getPromise(cladeNodeAttrDescsAtom({ datasetName }))) ?? []
  const phenotypeAttrDescs = (await snapshot.getPromise(phenotypeAttrDescsAtom({ datasetName }))) ?? []
  const refNodes = (await snapshot.getPromise(refNodesAtom({ datasetName }))) ?? {}

  return worker.serializeResultsJson(results, errors, cladeNodeAttrDescs, phenotypeAttrDescs, refNodes, PACKAGE_VERSION)
}

export function useExportJson({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot, worker) => {
    const jsonStr = await prepareResultsJson(snapshot, datasetName, worker)
    saveFile(jsonStr, filename, 'application/json;charset=utf-8')
  })
}

async function prepareResultsNdjson(snapshot: Snapshot, datasetName: string, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, datasetName, (result) => result.analysisResult)
  const errors = await mapErrors(snapshot, datasetName, (err) => err)
  return worker.serializeResultsNdjson(results, errors)
}

export function useExportNdjson({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot, worker) => {
    const ndjsonStr = await prepareResultsNdjson(snapshot, datasetName, worker)
    saveFile(ndjsonStr, filename, 'application/x-ndjson;charset=utf-8')
  })
}

async function prepareOutputTree(snapshot: Snapshot, datasetName: string) {
  const tree = await snapshot.getPromise(treeAtom({ datasetName }))
  if (!tree) {
    return undefined
  }
  return JSON.stringify(tree, null, 2)
}

export function useExportTree({ datasetName }: { datasetName: string }) {
  const tree = useRecoilValue(treeAtom({ datasetName }))
  const res = useResultsExport(async (filename, snapshot) => {
    const jsonStr = await prepareOutputTree(snapshot, datasetName)
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

export async function prepareOutputTreeNwk(snapshot: Snapshot, datasetName: string) {
  return snapshot.getPromise(treeNwkAtom({ datasetName }))
}

export function useExportTreeNwk({ datasetName }: { datasetName: string }) {
  const tree = useRecoilValue(treeNwkAtom({ datasetName }))

  const res = useResultsExport(async (filename, snapshot, _) => {
    const nwk = await prepareOutputTreeNwk(snapshot, datasetName)
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

async function preparePeptideFiles(snapshot: Snapshot, datasetName: string) {
  const peptides = await mapGoodResults(snapshot, datasetName, ({ translation, analysisResult: { seqName } }) => ({
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

export function useExportPeptides({ datasetName }: { datasetName: string }) {
  const cdses = useRecoilValue(cdsesAtom({ datasetName }))

  const res = useResultsExport(async (filename, snapshot) => {
    const files = await preparePeptideFiles(snapshot, datasetName)
    await saveZip({ files, filename })
  })

  if (isEmpty(cdses)) {
    return undefined
  }

  return res
}

async function prepareResultsGff(snapshot: Snapshot, datasetName: string, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, datasetName, (result) => result.analysisResult)
  return worker.serializeResultsGff(results)
}

export function useExportGff({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsGff(snapshot, datasetName, worker)
    saveFile(csvStr, filename, 'text/x-gff3;charset=utf-8')
  })
}

async function prepareResultsTbl(snapshot: Snapshot, datasetName: string, worker: ExportWorker) {
  const results = await mapGoodResults(snapshot, datasetName, (result) => result.analysisResult)
  return worker.serializeResultsTbl(results)
}

export function useExportTbl({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsTbl(snapshot, datasetName, worker)
    saveFile(csvStr, filename, 'text/x-tbl;charset=utf-8')
  })
}

export function useExportZip({ datasetName }: { datasetName: string }) {
  return useResultsExport(async (filename, snapshot, worker) => {
    const csvStr = await prepareResultsCsv(snapshot, datasetName, worker, ';')
    const tsvStr = await prepareResultsCsv(snapshot, datasetName, worker, '\t')
    const jsonStr = await prepareResultsJson(snapshot, datasetName, worker)
    const ndjsonStr = await prepareResultsNdjson(snapshot, datasetName, worker)
    const treeJsonStr = await prepareOutputTree(snapshot, datasetName)
    const treeNwkStr = await prepareOutputTreeNwk(snapshot, datasetName)
    const fastaStr = await prepareOutputFasta(snapshot, datasetName)
    const peptideFiles = await preparePeptideFiles(snapshot, datasetName)
    const gffStr = await prepareResultsGff(snapshot, datasetName, worker)
    const tblStr = await prepareResultsTbl(snapshot, datasetName, worker)

    const files: ZipFileDescription[] = [
      ...peptideFiles,
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

    if (gffStr) {
      files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameGff, data: gffStr })
    }

    if (tblStr) {
      files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameTbl, data: tblStr })
    }

    await saveZip({ filename, files })
  })
}
