import { AuspiceJsonV2 } from 'auspice'
import type { Subscription } from 'observable-fns'
import { AnalysisResult } from 'src/algorithms/types'
import type { Worker as ThreadsJsWorker, Thread } from 'threads'
import type { Pool as PoolType, PoolOptions } from 'threads/dist/master/pool'
import { TaskRunFunction } from 'threads/dist/master/pool-types'
import type { WorkerDescriptor } from 'threads/dist/master/pool-types'
import { Pool as createPool, spawn as spawnBase } from 'threads'
import { concurrent } from 'fasy'

import type { FastaRecord } from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen/nextclade-wasm'
import type { NextcladeWasmThread, NextcladeWasmWorker } from 'src/workers/nextcladeWasm.worker'
import type { GoThread } from 'src/workers/go.worker'

const WORKER_TIMEOUT_MS = 60 * 1000

/** Wraps `spawn()` from `threads` package to provide a custom initialization timeout interval */
export function spawn<SpawnedWorkerType>(worker: Worker) {
  return spawnBase(worker as unknown as ThreadsJsWorker, {
    timeout: WORKER_TIMEOUT_MS,
  }) as unknown as Promise<SpawnedWorkerType>
}

export class PoolExtended<ThreadType extends Thread> {
  private pool: PoolType<ThreadType>
  private workers: ThreadType[] = []

  private getWorkers(): WorkerDescriptor<ThreadType>[] {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return this.pool.workers as unknown as WorkerDescriptor<ThreadType>[]
  }

  private constructor(worker: Worker, options?: PoolOptions) {
    this.pool = createPool<ThreadType>(() => spawn<ThreadType>(worker), options)
  }

  public static async create<ThreadType extends Thread>(worker: Worker, options?: PoolOptions) {
    const self = new PoolExtended<ThreadType>(worker, options)

    self.workers = await concurrent.map(async (poolWorkerPromise: WorkerDescriptor<ThreadType>) => {
      return poolWorkerPromise.init
    }, self.getWorkers())

    return self
  }

  /** Runs a function once on every worker  */
  public async forEachWorker(fn: (thread: ThreadType) => void | Promise<void>) {
    return concurrent.forEach(fn, this.workers)
  }

  public async completed(allowResolvingImmediately?: boolean) {
    return this.pool.completed(allowResolvingImmediately)
  }

  public async settled(allowResolvingImmediately?: boolean) {
    return this.pool.settled(allowResolvingImmediately)
  }

  public events() {
    return this.pool.events()
  }

  public async queue<Return>(task: TaskRunFunction<ThreadType, Return>) {
    return this.pool.queue(task)
  }

  public async terminate(force?: boolean) {
    return this.pool.terminate(force)
  }
}

export class AnalysisWorkerPool {
  pool!: PoolExtended<NextcladeWasmThread>

  results: AnalysisResult[] = []

  private constructor() {}

  public static async create(numThreads: number, params: NextcladeParamsPojo) {
    const self = new AnalysisWorkerPool()
    await self.init(numThreads, params)
    return self
  }

  private async init(numThreads: number, params: NextcladeParamsPojo) {
    // Spawn the pool of WebWorkers
    const nextcladeWorkerModule = new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url), {
      name: 'nextcladeWebWorker',
    })

    this.pool = await PoolExtended.create<NextcladeWasmThread>(nextcladeWorkerModule, {
      size: numThreads,
      concurrency: 1,
      name: 'pool.analyze',
      maxQueuedJobs: undefined,
    })

    await this.pool.forEachWorker(async (worker) => worker.create(params))
  }

  public async analyze(record: FastaRecord) {
    const result = await this.pool.queue((worker) => worker.analyze(record))

    if (result.result) {
      this.results.push(result.result.analysisResult)
    }

    return result
  }

  public async getOutputTree() {
    const treeStr = await this.pool.queue((worker) => worker.getOutputTree(JSON.stringify(this.results)))
    return JSON.parse(treeStr) as AuspiceJsonV2
  }

  public async destroy() {
    await this.pool.forEachWorker(async (worker) => worker.destroy())
  }

  public async completed() {
    return this.pool.completed()
  }

  public async terminate() {
    await this.destroy()
    await this.pool.terminate(true)
  }
}

export async function createGoWorker(): Promise<GoThread> {
  const goWorkerModule = new Worker(new URL('src/workers/go.worker.ts', import.meta.url), { name: 'launcherWebWorker' })
  return spawn<GoThread>(goWorkerModule)
}

export class FastaParserWorker {
  private subscription!: Subscription<FastaRecord>
  private thread!: NextcladeWasmWorker

  private constructor() {}

  static async create() {
    const self = new FastaParserWorker()
    await self.init()
    return self
  }

  async init() {
    this.thread = await spawn<NextcladeWasmWorker>(
      new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url)),
    )
  }

  async parseSequencesStreaming(
    fastaStr: string,
    onSequence: (seq: FastaRecord) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
  ) {
    this.subscription = this.thread.values().subscribe(onSequence, onError, onComplete)
    await this.thread.parseSequencesStreaming(fastaStr)
  }

  async destroy() {
    await this.subscription.unsubscribe() // eslint-disable-line @typescript-eslint/await-thenable
    await this.thread.destroy()
  }
}

export async function serializeToCsv(analysisResultsStr: string, delimiter: string) {
  return ''
}

export async function serializeInsertionsToCsv(analysisResultsStr: string) {
  return ''
}
