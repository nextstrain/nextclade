import { CladeNodeAttrDesc } from 'auspice'
import type {
  AaMotifsDesc,
  AnalysisError,
  AnalysisInitialData,
  AnalysisResult,
  AuspiceRefNodesDesc,
  PhenotypeAttrDesc,
} from 'src/types'
import { Thread } from 'threads'
import type { NextcladeWasmThread } from 'src/workers/nextcladeWasm.worker'
import { spawn } from 'src/workers/spawn'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { CsvColumnConfig } from 'src/types'
import {
  canCallExportWorker,
  canTerminateExportWorker,
  ExportWorkerLifecycle,
  isFatalWasmError,
  shouldReleaseSingleton,
} from 'src/workers/workerLifecycle'

/**
 * Worker that serializes results for export. One worker serves the tab.
 *
 * After a fatal WebAssembly error the worker retires: it releases the singleton, so that the next `get()` spawns a
 * fresh worker, refuses new calls, and terminates its Web Worker once every call in progress has settled.
 */
export class ExportWorker {
  private static current: ExportWorker | undefined

  private readonly thread: Promise<NextcladeWasmThread>

  private lifecycle: ExportWorkerLifecycle = { phase: 'active', numCallsInProgress: 0 }

  private retirementError: Error | undefined = undefined

  private constructor() {
    this.thread = spawn<NextcladeWasmThread>(
      new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url), {
        name: 'src/workers/nextcladeWasm.worker.ts',
      }),
    )
  }

  /** Return the export worker of the tab, and spawn it if there is none. A failed spawn is not cached */
  public static async get(): Promise<ExportWorker> {
    this.current ??= new ExportWorker()
    const worker = this.current
    try {
      await worker.thread
    } catch (error: unknown) {
      if (shouldReleaseSingleton(this.current, worker)) {
        this.current = undefined
      }
      throw error
    }
    return worker
  }

  public async serializeResultsJson(
    outputs: AnalysisResult[],
    errors: AnalysisError[],
    cladeNodeAttrsJson: CladeNodeAttrDesc[],
    phenotypeAttrsJson: PhenotypeAttrDesc[],
    refNodes: AuspiceRefNodesDesc,
    nextcladeWebVersion: string,
  ): Promise<string> {
    return this.call((thread) =>
      thread.serializeResultsJson(
        outputs,
        errors,
        cladeNodeAttrsJson,
        phenotypeAttrsJson,
        refNodes,
        nextcladeWebVersion,
      ),
    )
  }

  public async serializeResultsCsv(
    results: AnalysisResult[],
    errors: AnalysisError[],
    cladeNodeAttrs: CladeNodeAttrDesc[],
    phenotypeAttrs: PhenotypeAttrDesc[],
    refNodes: AuspiceRefNodesDesc,
    aaMotifsDescs: AaMotifsDesc[],
    mutationPatternKeys: string[],
    delimiter: string,
    csvColumnConfig: CsvColumnConfig,
  ) {
    return this.call((thread) =>
      thread.serializeResultsCsv(
        results,
        errors,
        cladeNodeAttrs,
        phenotypeAttrs,
        refNodes,
        aaMotifsDescs,
        mutationPatternKeys,
        delimiter,
        csvColumnConfig,
      ),
    )
  }

  public async serializeResultsExcel(
    results: AnalysisResult[],
    errors: AnalysisError[],
    allInitialData: Map<string, AnalysisInitialData>,
    csvColumnConfig: CsvColumnConfig,
    datasetNameToSeqIndices: Map<string, number[]>,
    seqIndicesWithoutDatasetSuggestions: number[],
  ) {
    return this.call((thread) =>
      thread.serializeResultsExcel(
        results,
        errors,
        allInitialData,
        csvColumnConfig,
        datasetNameToSeqIndices,
        seqIndicesWithoutDatasetSuggestions,
      ),
    )
  }

  public async serializeResultsNdjson(results: AnalysisResult[], errors: AnalysisError[]) {
    return this.call((thread) => thread.serializeResultsNdjson(results, errors))
  }

  public async serializeResultsGff(results: AnalysisResult[]) {
    return this.call((thread) => thread.serializeResultsGff(results))
  }

  public async serializeResultsTbl(results: AnalysisResult[]) {
    return this.call((thread) => thread.serializeResultsTbl(results))
  }

  public async serializeUnknownCsv(
    errors: AnalysisError[],
    seqIndicesWithoutDatasetSuggestions: number[],
    delimiter: string,
  ) {
    return this.call((thread) => thread.serializeUnknownCsv(errors, seqIndicesWithoutDatasetSuggestions, delimiter))
  }

  /** Run a call on the Web Worker, and retire this worker if the call fails with a fatal WebAssembly error */
  private async call<T>(fn: (thread: NextcladeWasmThread) => Promise<T>): Promise<T> {
    if (!canCallExportWorker(this.lifecycle)) {
      throw this.retirementError ?? new ErrorInternal('Export worker has been retired')
    }

    this.lifecycle = { ...this.lifecycle, numCallsInProgress: this.lifecycle.numCallsInProgress + 1 }
    try {
      return await fn(await this.thread)
    } catch (error: unknown) {
      if (isFatalWasmError(error)) {
        this.retire(error)
      }
      throw error
    } finally {
      this.lifecycle = { ...this.lifecycle, numCallsInProgress: this.lifecycle.numCallsInProgress - 1 }
      this.terminateIfSettled()
    }
  }

  private retire(error: Error) {
    if (!canCallExportWorker(this.lifecycle)) {
      return
    }
    this.lifecycle = { ...this.lifecycle, phase: 'retired' }
    this.retirementError = error
    if (shouldReleaseSingleton(ExportWorker.current, this)) {
      ExportWorker.current = undefined
    }
    this.terminateIfSettled()
  }

  private terminateIfSettled() {
    if (!canTerminateExportWorker(this.lifecycle)) {
      return
    }
    this.lifecycle = { ...this.lifecycle, phase: 'terminated' }
    void this.terminate() // eslint-disable-line no-void
  }

  private async terminate() {
    try {
      const thread = await this.thread
      await thread.destroy()
      await Thread.terminate(thread)
    } catch (error: unknown) {
      // The export has already reported its own error, so a failed teardown is only logged
      console.warn('Unable to terminate the export worker:', error)
    }
  }
}
