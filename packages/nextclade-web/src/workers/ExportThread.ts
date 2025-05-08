import { CladeNodeAttrDesc } from 'auspice'
import type {
  AaMotifsDesc,
  AnalysisError,
  AnalysisInitialData,
  AnalysisResult,
  AuspiceRefNodesDesc,
  PhenotypeAttrDesc,
} from 'src/types'
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
    refNodes: AuspiceRefNodesDesc,
    nextcladeWebVersion: string,
  ): Promise<string> {
    return this.thread.serializeResultsJson(
      outputs,
      errors,
      cladeNodeAttrsJson,
      phenotypeAttrsJson,
      refNodes,
      nextcladeWebVersion,
    )
  }

  public async serializeResultsCsv(
    results: AnalysisResult[],
    errors: AnalysisError[],
    cladeNodeAttrs: CladeNodeAttrDesc[],
    phenotypeAttrs: PhenotypeAttrDesc[],
    refNodes: AuspiceRefNodesDesc,
    aaMotifsDescs: AaMotifsDesc[],
    delimiter: string,
    csvColumnConfig: CsvColumnConfig,
  ) {
    return this.thread.serializeResultsCsv(
      results,
      errors,
      cladeNodeAttrs,
      phenotypeAttrs,
      refNodes,
      aaMotifsDescs,
      delimiter,
      csvColumnConfig,
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
    return this.thread.serializeResultsExcel(
      results,
      errors,
      allInitialData,
      csvColumnConfig,
      datasetNameToSeqIndices,
      seqIndicesWithoutDatasetSuggestions,
    )
  }

  public async serializeResultsNdjson(results: AnalysisResult[], errors: AnalysisError[]) {
    return this.thread.serializeResultsNdjson(results, errors)
  }

  public async serializeResultsGff(results: AnalysisResult[]) {
    return this.thread.serializeResultsGff(results)
  }

  public async serializeResultsTbl(results: AnalysisResult[]) {
    return this.thread.serializeResultsTbl(results)
  }

  private async destroy() {
    await this.thread.destroy()
  }

  public static async destroy() {
    await this.self?.destroy()
    this.self = undefined
  }
}
