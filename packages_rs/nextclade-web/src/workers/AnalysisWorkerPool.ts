import type { AuspiceJsonV2 } from 'auspice'

import type { AnalysisInitialData, AnalysisResult, FastaRecord, NextcladeParamsRaw } from 'src/types'
import type { NextcladeWasmThread } from 'src/workers/nextcladeWasm.worker'
import { PoolExtended } from 'src/workers/ThreadPoolExtended'

export class AnalysisWorkerPool {
  pool!: PoolExtended<NextcladeWasmThread>

  results: AnalysisResult[] = []

  private constructor() {}

  public static async create(numThreads: number, params: NextcladeParamsRaw) {
    const self = new AnalysisWorkerPool()
    await self.init(numThreads, params)
    return self
  }

  private async init(numThreads: number, params: NextcladeParamsRaw) {
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

  public async getInitialData(): Promise<AnalysisInitialData> {
    return this.pool.queue((worker) => worker.getInitialData())
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
