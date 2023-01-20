import { CladeNodeAttrDesc } from 'auspice'
import type { AaMotifsDesc, AnalysisError, AnalysisResult, ErrorsFromWeb, PhenotypeAttrDesc } from 'src/types'
import type { NextcladeWasmWorker } from 'src/workers/nextcladeWasm.worker'
import { spawn } from 'src/workers/spawn'
import { CsvColumnConfig } from 'src/types'

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
    errors: AnalysisError[],
    cladeNodeAttrsJson: CladeNodeAttrDesc[],
    phenotypeAttrsJson: PhenotypeAttrDesc[],
    nextcladeWebVersion: string,
  ): Promise<string> {
    return this.thread.serializeResultsJson(
      outputs,
      errors,
      cladeNodeAttrsJson,
      phenotypeAttrsJson,
      nextcladeWebVersion,
    )
  }

  public async serializeResultsCsv(
    results: AnalysisResult[],
    errors: AnalysisError[],
    cladeNodeAttrs: CladeNodeAttrDesc[],
    phenotypeAttrs: PhenotypeAttrDesc[],
    aaMotifsDescs: AaMotifsDesc[],
    delimiter: string,
    csvColumnConfig: CsvColumnConfig,
  ) {
    return this.thread.serializeResultsCsv(
      results,
      errors,
      cladeNodeAttrs,
      phenotypeAttrs,
      aaMotifsDescs,
      delimiter,
      csvColumnConfig,
    )
  }

  public async serializeResultsNdjson(results: AnalysisResult[], errors: AnalysisError[]) {
    return this.thread.serializeResultsNdjson(results, errors)
  }

  public async serializeInsertionsCsv(results: AnalysisResult[], errors: AnalysisError[]) {
    return this.thread.serializeInsertionsCsv(results, errors)
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
