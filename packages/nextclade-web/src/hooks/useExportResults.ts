import { isEmpty, isNil } from 'lodash'
import { useState, useCallback } from 'react'
import { useAtomValue } from 'jotai'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import { datasetNameToSeqIndicesAtom, seqIndicesWithoutDatasetSuggestionsAtom } from 'src/state/autodetect.state'
import type {
  AnalysisError,
  AnalysisOutput,
  AnalysisResult,
  NextcladeResult,
  AaMotifsDesc,
  AuspiceRefNodesDesc,
  CsvColumnConfig,
  PhenotypeAttrDesc,
} from 'src/types'
import type { CladeNodeAttrDesc } from 'auspice'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { saveBase64File, saveFile, saveZip, ZipFileDescription } from 'src/helpers/saveFile'
import { globalErrorAtom } from 'src/state/error.state'
import {
  aaMotifsDescsAtom,
  allInitialDataAtom,
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
  filenameExcel: string
  filenameUnknownTsv: string
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
  filenameExcel: 'nextclade.xlsx',
  filenameUnknownTsv: 'nextclade.unclassified.tsv',
}

type ExportFunction = (filename: string, worker: ExportWorker) => Promise<void>

function useResultsExport(exportFn: ExportFunction) {
  const [isRunning, setIsRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const setGlobalError = useSetRecoilState(globalErrorAtom)

  const fn = useCallback(
    (filename: string) => {
      setIsRunning(true)
      setIsDone(false)

      ExportWorker.get()
        .then(async (worker) => {
          await exportFn(filename, worker)
          setIsDone(true)
        })
        .catch((error) => {
          setGlobalError(error)
        })
        .finally(() => {
          setIsRunning(false)
        })
    },
    [exportFn, setGlobalError]
  )

  return { isRunning, isDone, fn }
}

function mapAllGoodResults<T>(results: NextcladeResult[], mapFn: (result: AnalysisOutput) => T): T[] {
  return results
    .filter((result) => notUndefinedOrNull(result.result))
    .map((result) => {
      if (!result.result) {
        throw new ErrorInternal('When preparing analysis results for export: expected result to be non-nil')
      }
      return mapFn(result.result)
    })
}

function mapAllErrors<T>(results: NextcladeResult[], mapFn: (result: AnalysisError) => T): T[] {
  return results
    .filter((result) => notUndefinedOrNull(result.error))
    .map(({ error, seqName, index }) => {
      if (!error) {
        throw new ErrorInternal('When preparing analysis errors for export: expected error to be non-nil')
      }
      return mapFn({ index, seqName, errors: [error] })
    })
}

function mapGoodResults<T>(results: NextcladeResult[], datasetName: string, mapFn: (result: AnalysisOutput) => T): T[] {
  const filteredResults = results.filter(
    (result) => result.result?.analysisResult.datasetName === datasetName
  )

  return filteredResults
    .filter((result) => notUndefinedOrNull(result.result))
    .map((result) => {
      if (!result.result) {
        throw new ErrorInternal('When preparing analysis results for export: expected result to be non-nil')
      }
      return mapFn(result.result)
    })
}

function mapErrors<T>(results: NextcladeResult[], datasetName: string, mapFn: (result: AnalysisError) => T): T[] {
  const filteredResults = results.filter(
    (result) => result.result?.analysisResult.datasetName === datasetName
  )

  return filteredResults
    .filter((result) => notUndefinedOrNull(result.error))
    .map(({ error, seqName, index }) => {
      if (!error) {
        throw new ErrorInternal('When preparing analysis errors for export: expected error to be non-nil')
      }
      return mapFn({ index, seqName, errors: [error] })
    })
}

async function prepareCsvData(
  results: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrDescs: CladeNodeAttrDesc[] | undefined,
  phenotypeAttrDescs: PhenotypeAttrDesc[] | undefined,
  refNodes: AuspiceRefNodesDesc | undefined,
  aaMotifsDescs: AaMotifsDesc[] | undefined,
  csvColumnConfig: CsvColumnConfig,
  delimiter: string,
  worker: ExportWorker
): Promise<string> {
  return worker.serializeResultsCsv(
    results,
    errors,
    cladeNodeAttrDescs ?? [],
    phenotypeAttrDescs ?? [],
    refNodes ?? {},
    aaMotifsDescs ?? [],
    delimiter,
    csvColumnConfig
  )
}

async function prepareJsonData(
  results: AnalysisResult[],
  errors: AnalysisError[],
  cladeNodeAttrDescs: CladeNodeAttrDesc[] | undefined,
  phenotypeAttrDescs: PhenotypeAttrDesc[] | undefined,
  refNodes: AuspiceRefNodesDesc | undefined,
  worker: ExportWorker
): Promise<string> {
  return worker.serializeResultsJson(
    results,
    errors,
    cladeNodeAttrDescs ?? [],
    phenotypeAttrDescs ?? [],
    refNodes ?? {},
    PACKAGE_VERSION
  )
}

function prepareFastaData(analysisResults: NextcladeResult[], datasetName: string): string {
  const fastaEntries = mapGoodResults(
    analysisResults,
    datasetName,
    (result) => `>${result.analysisResult.seqName}\n${result.query}`
  )
  return `${fastaEntries.join('\n')}\n`
}

function preparePeptideFiles(analysisResults: NextcladeResult[], datasetName: string): ZipFileDescription[] {
  const peptides = mapGoodResults(analysisResults, datasetName, ({ translation, analysisResult: { seqName } }) => ({
    seqName,
    translation,
  }))

  const peptideFilesMap = new Map<string, ZipFileDescription>()
  for (const { seqName, translation } of peptides) {
    for (const [_, { cdses }] of Object.entries(translation.genes)) {
      for (const [_, { name, seq }] of Object.entries(cdses)) {
        const file = peptideFilesMap.get(name)
        const fastaEntry = `>${seqName}\n${seq}\n`
        if (file) {
          file.data = `${file.data}${fastaEntry}`
        } else {
          let peptidesFilename = DEFAULT_EXPORT_PARAMS.filenamePeptidesTemplate
          peptidesFilename = peptidesFilename.replace('{{cds}}', name)
          peptideFilesMap.set(name, { filename: peptidesFilename, data: fastaEntry })
        }
      }
    }
  }
  return Array.from(peptideFilesMap.values())
}

export const useExportFasta = createSimpleExportHook(
  prepareFastaData,
  'application/x-fasta;charset=utf-8'
)

export const useExportCsv = createCsvExportHook(';', 'text/csv;charset=utf-8')

export const useExportTsv = createCsvExportHook('\t', 'text/tab-separated-values;charset=utf-8')

export function useExportExcel() {
  const analysisResults = useAtomValue(analysisResultsAtom)
  const allInitialData = useRecoilValue(allInitialDataAtom)
  const csvColumnConfig = useRecoilValue(csvColumnConfigAtom)
  const datasetNameToSeqIndices = useRecoilValue(datasetNameToSeqIndicesAtom)
  const seqIndicesWithoutDatasetSuggestions = useRecoilValue(seqIndicesWithoutDatasetSuggestionsAtom)

  const exportFn = useCallback(
    async (filename: string, worker: ExportWorker) => {
      const results = mapAllGoodResults(analysisResults, (result) => result.analysisResult)
      const errors = mapAllErrors(analysisResults, (err) => err)

      if (!csvColumnConfig) {
        throw new ErrorInternal('CSV column config is not initialized, but it should be')
      }

      const excelData = await worker.serializeResultsExcel(
        results,
        errors,
        allInitialData,
        csvColumnConfig,
        datasetNameToSeqIndices,
        seqIndicesWithoutDatasetSuggestions
      )
      saveBase64File(excelData, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    },
    [analysisResults, allInitialData, csvColumnConfig, datasetNameToSeqIndices, seqIndicesWithoutDatasetSuggestions]
  )

  return useResultsExport(exportFn)
}

export function useExportJson({ datasetName }: { datasetName: string }) {
  const analysisResults = useAtomValue(analysisResultsAtom)
  const cladeNodeAttrDescs = useRecoilValue(cladeNodeAttrDescsAtom({ datasetName }))
  const phenotypeAttrDescs = useRecoilValue(phenotypeAttrDescsAtom({ datasetName }))
  const refNodes = useRecoilValue(refNodesAtom({ datasetName }))

  const exportFn = useCallback(
    async (filename: string, worker: ExportWorker) => {
      const results = mapGoodResults(analysisResults, datasetName, (result) => result.analysisResult)
      const errors = mapErrors(analysisResults, datasetName, (err) => err)

      const jsonStr = await prepareJsonData(results, errors, cladeNodeAttrDescs, phenotypeAttrDescs, refNodes, worker)
      saveFile(jsonStr, filename, 'application/json;charset=utf-8')
    },
    [analysisResults, datasetName, cladeNodeAttrDescs, phenotypeAttrDescs, refNodes]
  )

  return useResultsExport(exportFn)
}

export const useExportNdjson = createResultErrorExportHook(
  (worker, results, errors) => worker.serializeResultsNdjson(results, errors),
  'application/x-ndjson;charset=utf-8'
)

export function useExportTree({ datasetName }: { datasetName: string }) {
  const tree = useRecoilValue(treeAtom(datasetName))

  const exportFn = useCallback(
    async (filename: string) => {
      if (!tree) {
        return
      }
      const jsonStr = JSON.stringify(tree, null, 2)
      saveFile(jsonStr, filename, 'application/json;charset=utf-8')
    },
    [tree]
  )

  if (isNil(tree)) {
    return undefined
  }

  return useResultsExport(exportFn)
}

export function useExportTreeNwk({ datasetName }: { datasetName: string }) {
  const treeNwk = useRecoilValue(treeNwkAtom({ datasetName }))

  const exportFn = useCallback(
    async (filename: string) => {
      if (isNil(treeNwk)) {
        return
      }
      saveFile(treeNwk, filename, 'text/x-nh;charset=utf-8')
    },
    [treeNwk]
  )

  if (isNil(treeNwk)) {
    return undefined
  }

  return useResultsExport(exportFn)
}

export function useExportPeptides({ datasetName }: { datasetName: string }) {
  const analysisResults = useAtomValue(analysisResultsAtom)
  const cdses = useRecoilValue(cdsesAtom({ datasetName }))

  const exportFn = useCallback(
    async (filename: string) => {
      const peptides = preparePeptideFiles(analysisResults, datasetName)

      const files = Array.from(peptides)
      await saveZip({ files, filename })
    },
    [analysisResults, datasetName]
  )

  if (isEmpty(cdses)) {
    return undefined
  }

  return useResultsExport(exportFn)
}

export const useExportGff = createSimpleResultExportHook(
  (worker, results) => worker.serializeResultsGff(results),
  'text/x-gff3;charset=utf-8'
)

export const useExportTbl = createSimpleResultExportHook(
  (worker, results) => worker.serializeResultsTbl(results),
  'text/x-tbl;charset=utf-8'
)

async function prepareAllExportData(
  analysisResults: NextcladeResult[],
  datasetName: string,
  cladeNodeAttrDescs: CladeNodeAttrDesc[] | undefined,
  phenotypeAttrDescs: PhenotypeAttrDesc[] | undefined,
  refNodes: AuspiceRefNodesDesc | undefined,
  aaMotifsDescs: AaMotifsDesc[] | undefined,
  csvColumnConfig: CsvColumnConfig | undefined,
  worker: ExportWorker
) {
  const results = mapGoodResults(analysisResults, datasetName, (result) => result.analysisResult)
  const errors = mapErrors(analysisResults, datasetName, (err) => err)

  if (!csvColumnConfig) {
    throw new ErrorInternal('CSV column config is not initialized, but it should be')
  }

  const [csvStr, tsvStr, jsonStr, ndjsonStr, gffStr, tblStr] = await Promise.all([
    prepareCsvData(results, errors, cladeNodeAttrDescs ?? [], phenotypeAttrDescs ?? [], refNodes, aaMotifsDescs ?? [], csvColumnConfig, ';', worker),
    prepareCsvData(results, errors, cladeNodeAttrDescs ?? [], phenotypeAttrDescs ?? [], refNodes, aaMotifsDescs ?? [], csvColumnConfig, '\t', worker),
    prepareJsonData(results, errors, cladeNodeAttrDescs ?? [], phenotypeAttrDescs ?? [], refNodes, worker),
    worker.serializeResultsNdjson(results, errors),
    worker.serializeResultsGff(results),
    worker.serializeResultsTbl(results),
  ])

  const fastaStr = prepareFastaData(analysisResults, datasetName)
  const peptides = preparePeptideFiles(analysisResults, datasetName)

  return {
    csvStr,
    tsvStr,
    jsonStr,
    ndjsonStr,
    fastaStr,
    peptides,
    gffStr,
    tblStr,
  }
}

export function useExportZip({ datasetName }: { datasetName: string }) {
  const analysisResults = useAtomValue(analysisResultsAtom)
  const cladeNodeAttrDescs = useRecoilValue(cladeNodeAttrDescsAtom({ datasetName }))
  const phenotypeAttrDescs = useRecoilValue(phenotypeAttrDescsAtom({ datasetName }))
  const refNodes = useRecoilValue(refNodesAtom({ datasetName }))
  const aaMotifsDescs = useRecoilValue(aaMotifsDescsAtom({ datasetName }))
  const csvColumnConfig = useRecoilValue(csvColumnConfigAtom)
  const tree = useRecoilValue(treeAtom(datasetName))
  const treeNwk = useRecoilValue(treeNwkAtom({ datasetName }))

  const exportFn = useCallback(
    async (filename: string, worker: ExportWorker) => {
      const exportData = await prepareAllExportData(
        analysisResults,
        datasetName,
        cladeNodeAttrDescs,
        phenotypeAttrDescs,
        refNodes,
        aaMotifsDescs,
        csvColumnConfig,
        worker
      )

      const files: ZipFileDescription[] = [
        ...exportData.peptides,
        { filename: DEFAULT_EXPORT_PARAMS.filenameCsv, data: exportData.csvStr },
        { filename: DEFAULT_EXPORT_PARAMS.filenameTsv, data: exportData.tsvStr },
        { filename: DEFAULT_EXPORT_PARAMS.filenameJson, data: exportData.jsonStr },
        { filename: DEFAULT_EXPORT_PARAMS.filenameNdjson, data: exportData.ndjsonStr },
        { filename: DEFAULT_EXPORT_PARAMS.filenameFasta, data: exportData.fastaStr },
      ]

      if (tree) {
        const treeJsonStr = JSON.stringify(tree, null, 2)
        files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameTree, data: treeJsonStr })
      }

      if (treeNwk) {
        files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameTreeNwk, data: treeNwk })
      }

      if (exportData.gffStr) {
        files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameGff, data: exportData.gffStr })
      }

      if (exportData.tblStr) {
        files.push({ filename: DEFAULT_EXPORT_PARAMS.filenameTbl, data: exportData.tblStr })
      }

      await saveZip({ filename, files })
    },
    [
      analysisResults,
      datasetName,
      cladeNodeAttrDescs,
      phenotypeAttrDescs,
      refNodes,
      aaMotifsDescs,
      csvColumnConfig,
      tree,
      treeNwk,
    ]
  )

  return useResultsExport(exportFn)
}

export function useExportUnknownSeqTsv() {
  const analysisResults = useAtomValue(analysisResultsAtom)
  const seqIndicesWithoutDatasetSuggestions = useRecoilValue(seqIndicesWithoutDatasetSuggestionsAtom)

  const exportFn = useCallback(
    async (filename: string, worker: ExportWorker) => {
      const errors = mapAllErrors(analysisResults, (err) => err)
      const tsvStr = await worker.serializeUnknownCsv(errors, seqIndicesWithoutDatasetSuggestions, '\t')
      saveFile(tsvStr, filename, 'text/tab-separated-values;charset=utf-8')
    },
    [analysisResults, seqIndicesWithoutDatasetSuggestions]
  )

  return useResultsExport(exportFn)
}

function createCsvExportHook(delimiter: string, mimeType: string) {
  return function csvExportHook({ datasetName }: { datasetName: string }) {
    const analysisResults = useAtomValue(analysisResultsAtom)
    const cladeNodeAttrDescs = useRecoilValue(cladeNodeAttrDescsAtom({ datasetName }))
    const phenotypeAttrDescs = useRecoilValue(phenotypeAttrDescsAtom({ datasetName }))
    const refNodes = useRecoilValue(refNodesAtom({ datasetName }))
    const aaMotifsDescs = useRecoilValue(aaMotifsDescsAtom({ datasetName }))
    const csvColumnConfig = useRecoilValue(csvColumnConfigAtom)

    const exportFn = useCallback(
      async (filename: string, worker: ExportWorker) => {
        const results = mapGoodResults(analysisResults, datasetName, (result) => result.analysisResult)
        const errors = mapErrors(analysisResults, datasetName, (err) => err)

        if (!csvColumnConfig) {
          throw new ErrorInternal('CSV column config is not initialized, but it should be')
        }

        const csvStr = await prepareCsvData(
          results,
          errors,
          cladeNodeAttrDescs,
          phenotypeAttrDescs,
          refNodes,
          aaMotifsDescs,
          csvColumnConfig,
          delimiter,
          worker
        )
        saveFile(csvStr, filename, mimeType)
      },
      [analysisResults, datasetName, cladeNodeAttrDescs, phenotypeAttrDescs, refNodes, aaMotifsDescs, csvColumnConfig]
    )

    return useResultsExport(exportFn)
  }
}

function createSimpleResultExportHook(
  workerMethod: (worker: ExportWorker, results: AnalysisResult[]) => Promise<string>,
  mimeType: string
) {
  return function simpleResultExportHook({ datasetName }: { datasetName: string }) {
    const analysisResults = useAtomValue(analysisResultsAtom)

    const exportFn = useCallback(
      async (filename: string, worker: ExportWorker) => {
        const results = mapGoodResults(analysisResults, datasetName, (result) => result.analysisResult)
        const data = await workerMethod(worker, results)
        saveFile(data, filename, mimeType)
      },
      [analysisResults, datasetName]
    )

    return useResultsExport(exportFn)
  }
}

function createResultErrorExportHook(
  workerMethod: (worker: ExportWorker, results: AnalysisResult[], errors: AnalysisError[]) => Promise<string>,
  mimeType: string
) {
  return function resultErrorExportHook({ datasetName }: { datasetName: string }) {
    const analysisResults = useAtomValue(analysisResultsAtom)

    const exportFn = useCallback(
      async (filename: string, worker: ExportWorker) => {
        const results = mapGoodResults(analysisResults, datasetName, (result) => result.analysisResult)
        const errors = mapErrors(analysisResults, datasetName, (err) => err)
        const data = await workerMethod(worker, results, errors)
        saveFile(data, filename, mimeType)
      },
      [analysisResults, datasetName]
    )

    return useResultsExport(exportFn)
  }
}

function createSimpleExportHook(
  prepareData: (analysisResults: NextcladeResult[], datasetName: string) => string,
  mimeType: string
) {
  return function simpleExportHook({ datasetName }: { datasetName: string }) {
    const analysisResults = useAtomValue(analysisResultsAtom)

    const exportFn = useCallback(
      async (filename: string) => {
        const data = prepareData(analysisResults, datasetName)
        saveFile(data, filename, mimeType)
      },
      [analysisResults, datasetName]
    )

    return useResultsExport(exportFn)
  }
}
