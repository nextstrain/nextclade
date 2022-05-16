/* eslint-disable no-void,promise/always-return,unicorn/no-await-expression-member */
import { useCallback } from 'react'
import { Snapshot, useRecoilCallback } from 'recoil'
import { AnalysisOutput } from 'src/algorithms/types'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { notUndefined } from 'src/helpers/notUndefined'
import { saveFile } from 'src/helpers/saveFile'
import { globalErrorAtom } from 'src/state/error.state'
import { analysisResultsAtom, cladeNodeAttrDescsAtom, treeAtom } from 'src/state/results.state'
import { ExportWorker } from 'src/workers/ExportThread'

const PACKAGE_VERSION = process.env.PACKAGE_VERSION ?? 'unknown'

function useResultsExport(exportFn: (filename: string, snapshot: Snapshot, worker: ExportWorker) => Promise<void>) {
  return useRecoilCallback(
    ({ set, snapshot }) => {
      const snapshotRelease = snapshot.retain()
      return (filename: string) => {
        void ExportWorker.get()
          .then((worker) => exportFn(filename, snapshot, worker))
          .catch((error) => {
            set(globalErrorAtom, error)
          })
          .finally(() => {
            snapshotRelease()
          })
      }
    },
    [exportFn],
  )
}

async function mapGoodResults<T>(snapshot: Snapshot, mapFn: (result: AnalysisOutput) => T) {
  const results = await snapshot.getPromise(analysisResultsAtom)

  if (results.length === 0) {
    throw new ErrorInternal('When exporting analysis results into CSV: there is no results to export')
  }

  return results
    .filter((result) => notUndefined(result.result))
    .map((result) => {
      if (!result.result) {
        throw new ErrorInternal('When exporting analysis results into CSV: expected result to be non-nil')
      }
      return mapFn(result.result)
    })
}

export function useExportFasta() {
  return useResultsExport(async (filename, snapshot) => {
    let fastaStr = (
      await mapGoodResults(snapshot, (result) => `>${result.analysisResult.seqName}\n${result.query}`)
    ).join('\n')
    fastaStr += '\n'
    saveFile(fastaStr, filename, 'application/x-fasta;charset=utf-8')
  })
}

export function useExportCsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
    const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom)
    const csvStr = await worker.serializeResultsCsv(results, cladeNodeAttrDescs, ';')
    saveFile(csvStr, filename, 'text/csv;charset=utf-8')
  })
}

export function useExportTsv() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
    const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom)
    const tsvStr = await worker.serializeResultsCsv(results, cladeNodeAttrDescs, '\t')
    saveFile(tsvStr, filename, 'text/tab-separated-values;charset=utf-8')
  })
}

export function useExportJson() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
    const cladeNodeAttrDescs = await snapshot.getPromise(cladeNodeAttrDescsAtom)
    const jsonStr = await worker.serializeResultsJson(results, cladeNodeAttrDescs, PACKAGE_VERSION)
    saveFile(jsonStr, filename, 'application/json;charset=utf-8')
  })
}

export function useExportNdjson() {
  return useResultsExport(async (filename, snapshot, worker) => {
    const results = await mapGoodResults(snapshot, (result) => result.analysisResult)
    const ndjsonStr = await worker.serializeResultsNdjson(results)
    saveFile(ndjsonStr, filename, 'application/x-ndjson')
  })
}

export function useExportTree() {
  return useRecoilCallback(({ set, snapshot }) => {
    const snapshotRelease = snapshot.retain()
    return (filename: string) => {
      void snapshot
        .getPromise(treeAtom)
        .then((tree) => {
          if (!tree) {
            throw new ErrorInternal('When exporting tree: the tree data is not ready')
          }
          return JSON.stringify(tree, null, 2)
        })
        .then((jsonStr) => {
          saveFile(jsonStr, filename, 'application/json;charset=utf-8')
        })
        .catch((error) => {
          set(globalErrorAtom, error)
        })
        .finally(() => {
          snapshotRelease()
        })
    }
  }, [])
}

export function useExportInsertionsCsv() {
  return useCallback((filename: string) => {}, [])
}

export function useExportErrorsCsv() {
  return useCallback((filename: string) => {}, [])
}

export function useExportPeptides() {
  return useCallback((filename: string) => {}, [])
}

export function useExportZip() {
  return useCallback((filename: string) => {}, [])
}
