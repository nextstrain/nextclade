import { concurrent } from 'fasy'
import type {
  AnalysisInitialData,
  AnalysisResult,
  FastaRecord,
  NextcladeParamsRaw,
  NextcladeResult,
  OutputTrees,
} from 'src/types'
import { Thread } from 'threads'
import type { NextcladeWasmThread } from 'src/workers/nextcladeWasm.worker'
import { PoolExtended } from 'src/workers/ThreadPoolExtended'
import {
  analysisErrorAction,
  AnalysisPoolLifecycle,
  canDestroyPoolWorkers,
  canStartWorkerReplacement,
} from 'src/workers/workerLifecycle'

/**
 * Pool of analysis workers for one analysis run.
 *
 * The pool owns the lifecycle of its workers. A fatal WebAssembly error during the analysis of a sequence fails only
 * that sequence and replaces the broken worker (see `analysisErrorAction()`). Termination waits for pending
 * replacements, so that it never sends calls to a thread that a replacement has terminated.
 */
export class AnalysisWorkerPool {
  pool!: PoolExtended<NextcladeWasmThread>

  results: AnalysisResult[] = []

  private params!: NextcladeParamsRaw

  private numFatalErrors = 0

  private isClosing = false

  private readonly pendingReplacements = new Set<Promise<void>>()

  private termination: Promise<void> | undefined = undefined

  private constructor() {}

  public static async create(numThreads: number, params: NextcladeParamsRaw) {
    const self = new AnalysisWorkerPool()
    await self.init(numThreads, params)
    return self
  }

  private async init(numThreads: number, params: NextcladeParamsRaw) {
    this.params = params
    this.pool = await PoolExtended.create<NextcladeWasmThread>(
      () =>
        new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url), {
          name: 'src/workers/nextcladeWasm.worker.ts',
        }),
      {
        size: numThreads,
        concurrency: 1,
        name: 'pool.analyze',
        maxQueuedJobs: undefined,
      },
    )

    await this.pool.forEachWorker(async (worker) => worker.create(params))
  }

  public async getInitialData(datasetName: string): Promise<AnalysisInitialData> {
    return this.pool.queue((worker) => worker.getInitialData(datasetName))
  }

  public async analyze(datasetName: string, record: FastaRecord): Promise<NextcladeResult> {
    const result = await this.pool.queue(async (worker) => {
      try {
        return await worker.analyze(datasetName, record)
      } catch (error: unknown) {
        // The worker is replaced inside this task, so that no other task runs on the broken instance
        return this.onAnalysisError(worker, record, error)
      }
    })

    if (result.result) {
      this.results.push(result.result.analysisResult)
    }

    return result
  }

  public async getOutputTrees(datasetNames: string[]): Promise<Record<string, OutputTrees | undefined | null>> {
    const entries = await concurrent.map(async (datasetName) => {
      const resultsForDataset = this.results.filter((r) => r.datasetName === datasetName)
      const tree = await this.pool.queue<OutputTrees | undefined | null>((worker: NextcladeWasmThread) =>
        worker.getOutputTrees(datasetName, JSON.stringify(resultsForDataset)),
      )
      return [datasetName, tree]
    }, datasetNames)
    return Object.fromEntries(entries)
  }

  public async destroy() {
    await this.pool.forEachWorker(async (worker) => worker.destroy())
  }

  public async completed() {
    return this.pool.completed()
  }

  /** Terminate the pool. Every call awaits the same termination */
  public async terminate() {
    this.termination ??= this.terminateOnce()
    return this.termination
  }

  private async terminateOnce() {
    this.isClosing = true
    while (!canDestroyPoolWorkers(this.lifecycle())) {
      await Promise.allSettled(this.pendingReplacements) // eslint-disable-line no-await-in-loop
    }
    await this.destroy()
    await this.pool.terminate(true)
  }

  /** Return an error row for the sequence and replace the worker after a fatal error, or rethrow the error */
  private async onAnalysisError(
    worker: NextcladeWasmThread,
    record: FastaRecord,
    error: unknown,
  ): Promise<NextcladeResult> {
    const action = analysisErrorAction(error, this.numFatalErrors)
    if (action.type === 'rethrow') {
      throw error
    }
    this.numFatalErrors += 1

    if (canStartWorkerReplacement(this.lifecycle())) {
      const replacement = this.replaceWorker(worker)
      this.pendingReplacements.add(replacement)
      try {
        await replacement
      } finally {
        this.pendingReplacements.delete(replacement)
      }
    }

    return { index: record.index, seqName: record.seqName, error: action.message }
  }

  /**
   * Replace a broken worker with a new one, created with the parameters of the run. The new worker joins the pool only
   * after its creation succeeded, so no task runs on a worker without a WebAssembly instance.
   */
  private async replaceWorker(worker: NextcladeWasmThread) {
    const replacement = await this.pool.spawnWorker()
    try {
      await replacement.create(this.params)
    } catch (error: unknown) {
      await Thread.terminate(replacement)
      throw error
    }

    if (!canStartWorkerReplacement(this.lifecycle())) {
      await Thread.terminate(replacement)
      return
    }

    try {
      await this.pool.replaceWorker(worker, replacement)
    } catch (error: unknown) {
      await Thread.terminate(replacement)
      throw error
    }
  }

  private lifecycle(): AnalysisPoolLifecycle {
    return { isClosing: this.isClosing, numPendingReplacements: this.pendingReplacements.size }
  }
}
