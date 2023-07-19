import type { AnalysisResult, FastaRecord } from 'src/types'
import type { NextcladeParamsPojo, OutputTreesPojo } from 'src/gen/nextclade-wasm'
import type { LaunchAnalysisInitialData } from 'src/workers/launchAnalysis'
import type { NextcladeWasmThread } from 'src/workers/nextcladeWasm.worker'
import { PoolExtended } from 'src/workers/ThreadPoolExtended'

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

  public async getInitialData(): Promise<LaunchAnalysisInitialData> {
    return this.pool.queue((worker) => worker.getInitialData())
  }

  public async analyze(record: FastaRecord) {
    const result = await this.pool.queue((worker) => worker.analyze(record))

    if (result.result) {
      this.results.push(result.result.analysisResult)
    }

    return result
  }

  public async getOutputTrees(): Promise<OutputTreesPojo> {
    return this.pool.queue((worker) => worker.getOutputTrees(JSON.stringify(this.results)))
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
