import { CladeNodeAttrDesc } from 'auspice'
import { AnalysisResult, ErrorsFromWeb, ErrorsFromWeb } from 'src/algorithms/types'
import type { NextcladeWasmWorker } from 'src/workers/nextcladeWasm.worker'
import { spawn } from 'src/workers/spawn'

export class ExportWorker {
  private thread!: NextcladeWasmWorker
  private static self: ExportWorker | undefined

  private constructor() {}

  public static async get() {
    if (!this.self) {
      this.self = new ExportWorker()
      await this.self.init()
    }
    return this.self
  }

  private async init() {
    this.thread = await spawn<NextcladeWasmWorker>(
      new Worker(new URL('src/workers/nextcladeWasm.worker.ts', import.meta.url)),
    )
  }

  public async serializeResultsJson(
    outputs: AnalysisResult[],
    cladeNodeAttrsJson: CladeNodeAttrDesc[],
    nextcladeWebVersion: string,
  ): Promise<string> {
    return this.thread.serializeResultsJson(outputs, cladeNodeAttrsJson, nextcladeWebVersion)
  }

  public async serializeResultsCsv(
    results: AnalysisResult[],
    cladeNodeAttrsJson: CladeNodeAttrDesc[],
    delimiter: string,
  ) {
    return this.thread.serializeResultsCsv(results, cladeNodeAttrsJson, delimiter)
  }

  public async serializeResultsNdjson(results: AnalysisResult[]) {
    return this.thread.serializeResultsNdjson(results)
  }

  public async serializeInsertionsCsv(results: AnalysisResult[]) {
    return this.thread.serializeInsertionsCsv(results)
  }

  public async serializeErrorsCsv(errors: ErrorsFromWeb[]) {
    return this.thread.serializeErrorsCsv(errors)
  }

  private async destroy() {
    await this.thread.destroy()
  }

  public static async destroy() {
    await this.self?.destroy()
    this.self = undefined
  }
}
