import { concurrent } from 'fasy'
import type { AnalysisInitialData, AnalysisResult, FastaRecord, NextcladeParamsRaw, OutputTrees } from 'src/types'
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

  public async analyze(datasetName: string, record: FastaRecord) {
    const result = await this.pool.queue((worker) => worker.analyze(datasetName, record))

    if (result.result) {
      this.results.push(result.result.analysisResult)
    }

    return result
  }

  public async getOutputTrees(datasetNames: string[]): Promise<Record<string, OutputTrees | undefined | null>> {
    return Object.fromEntries(
      await concurrent.map(async (datasetName) => {
        const resultsForDataset = this.results.filter((r) => r.datasetName === datasetName)
        const tree = await this.pool.queue((worker) =>
          worker.getOutputTrees(datasetName, JSON.stringify(resultsForDataset)),
        )
        return [datasetName, tree]
      }, datasetNames),
    )
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
