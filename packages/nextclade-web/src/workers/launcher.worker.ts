import 'regenerator-runtime'

import type { Thread } from 'threads'
import { expose } from 'threads/worker'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'
import { omit, uniq } from 'lodash'
import { AlgorithmGlobalStatus } from 'src/types'
import type { FastaRecord, FastaRecordId, NextcladeResult, NextcladeParamsRaw, OutputTrees } from 'src/types'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { AnalysisWorkerPool } from 'src/workers/AnalysisWorkerPool'
import { FastaParserWorker } from 'src/workers/FastaParserThread'
import { ErrorInternal } from 'src/helpers/ErrorInternal'

export class ErrorLauncherModuleNotInitialized extends ErrorInternal {
  constructor(fnName: string) {
    super(
      `When calling 'module.${fnName}': Launcher WebWorker module has not been initialized yet. Make sure to call 'module.init()' function first.`,
    )
  }
}

class LauncherWorkerImpl {
  // Reports global analysis status to main thread
  analysisGlobalStatusObservable = new Subject<AlgorithmGlobalStatus>()

  // Relays messages from fasta parser webworker to the main thread
  parsedFastaObservable = new Subject<FastaRecordId>()

  // Relays results from analysis webworker pool to the main thread
  analysisResultsObservable = new Subject<NextcladeResult>()

  // Relays tree result from webworker to the main thread
  treeObservable = new Subject<Record<string, OutputTrees | undefined | null>>()

  fastaParser!: FastaParserWorker

  pool!: AnalysisWorkerPool

  datasetNames!: string[]

  seqIndexToTopDatasetName!: Map<number, string>

  seqIndicesWithoutDatasetSuggestions!: number[]

  private constructor() {}

  public static async create(
    numThreads: number,
    seqIndexToTopDatasetName: Map<number, string>,
    seqIndicesWithoutDatasetSuggestions: number[],
    params: NextcladeParamsRaw,
  ) {
    const self = new LauncherWorkerImpl()
    await self.init(numThreads, seqIndexToTopDatasetName, seqIndicesWithoutDatasetSuggestions, params)
    return self
  }

  private async init(
    numThreads: number,
    seqIndexToTopDatasetName: Map<number, string>,
    seqIndicesWithoutDatasetSuggestions: number[],
    params: NextcladeParamsRaw,
  ) {
    this.fastaParser = await FastaParserWorker.create()
    this.pool = await AnalysisWorkerPool.create(numThreads, params)
    this.seqIndexToTopDatasetName = seqIndexToTopDatasetName
    this.seqIndicesWithoutDatasetSuggestions = seqIndicesWithoutDatasetSuggestions
    this.datasetNames = uniq([...seqIndexToTopDatasetName.values()])
  }

  async getInitialData(datasetName: string) {
    return this.pool.getInitialData(datasetName)
  }

  async launch(qryFastaStr: string) {
    this.analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.initWorkers)

    try {
      this.analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.started)

      await this.fastaParser.parseSequencesStreaming(
        qryFastaStr,
        (record) => this.onSequence(record),
        (error) => this.onError(error),
      )
      await this.pool.completed()

      const trees = await this.pool.getOutputTrees(this.datasetNames)

      this.treeObservable.next(trees)

      this.analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.done)
      this.analysisResultsObservable.complete()
    } catch (error: unknown) {
      this.onError(error)
    } finally {
      void this.destroy() // eslint-disable-line no-void
    }
  }

  public async destroy() {
    await Promise.all([this.fastaParser.destroy(), this.pool.terminate()])
  }

  private onSequence(record: FastaRecord) {
    this.parsedFastaObservable.next(omit(record, 'seq'))
    this.onSequenceImpl(record).catch((error) => this.onError(error))
  }

  private async onSequenceImpl(record: FastaRecord) {
    if (this.seqIndicesWithoutDatasetSuggestions.includes(record.index)) {
      this.analysisResultsObservable.next({
        index: record.index,
        seqName: record.seqName,
        error: 'Unable to detect reference dataset',
      })
      return
    }

    const datasetName = this.seqIndexToTopDatasetName.get(record.index)
    if (!datasetName) {
      throw new ErrorInternal(`Unable to find selected dataset for sequence #${record.index} '${record.seqName}'`)
    }
    const result = await this.pool.analyze(datasetName, record)
    this.analysisResultsObservable.next(result)
  }

  private onError(error: unknown) {
    this.analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.failed)
    this.analysisResultsObservable.error(sanitizeError(error))
    void this.destroy() // eslint-disable-line no-void
  }
}

let launcher: LauncherWorkerImpl | undefined

// noinspection JSUnusedGlobalSymbols
const worker = {
  async init(
    numThreads: number,
    seqIndexToTopDatasetName: Map<number, string>,
    seqIndicesWithoutDatasetSuggestions: number[],
    params: NextcladeParamsRaw,
  ) {
    launcher = await LauncherWorkerImpl.create(
      numThreads,
      seqIndexToTopDatasetName,
      seqIndicesWithoutDatasetSuggestions,
      params,
    )
  },
  async getInitialData(datasetName: string) {
    if (!launcher) {
      throw new ErrorLauncherModuleNotInitialized('getInitialData')
    }
    return launcher.getInitialData(datasetName)
  },
  async launch(qryFastaStr: string) {
    if (!launcher) {
      throw new ErrorLauncherModuleNotInitialized('launch')
    }
    await launcher.launch(qryFastaStr)
  },
  async destroy() {
    if (!launcher) {
      return
    }
    await launcher.destroy()
    launcher = undefined
  },
  getAnalysisGlobalStatusObservable(): ThreadsObservable<AlgorithmGlobalStatus> {
    if (!launcher) {
      throw new ErrorLauncherModuleNotInitialized('getAnalysisGlobalStatusObservable')
    }
    return ThreadsObservable.from(launcher.analysisGlobalStatusObservable)
  },
  getAnalysisResultsObservable(): ThreadsObservable<NextcladeResult> {
    if (!launcher) {
      throw new ErrorLauncherModuleNotInitialized('getAnalysisResultsObservable')
    }
    return ThreadsObservable.from(launcher.analysisResultsObservable)
  },
  getTreeObservable(): ThreadsObservable<Record<string, OutputTrees | undefined | null>> {
    if (!launcher) {
      throw new ErrorLauncherModuleNotInitialized('getTreeObservable')
    }
    return ThreadsObservable.from(launcher.treeObservable)
  },
}

expose(worker)

export type LauncherWorker = typeof worker
export type LauncherThread = LauncherWorker & Thread
