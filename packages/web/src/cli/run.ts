/* eslint-disable cflint/no-this-assignment */
import { unset } from 'lodash'
import { Writable } from 'stream'

import { Pool } from 'threads'
import { FastaObject } from 'bionode-fasta'

import { notUndefined } from 'src/helpers/notUndefined'
import { sanitizeError } from 'src/helpers/sanitizeError'
import type { Gene, PcrPrimer, Virus } from 'src/algorithms/types'
import type { AnalyzeThread } from 'src/workers/worker.analyze'
import type { SequenceAnalysisStateWithMatch } from 'src/state/algorithm/algorithm.state'
import type { QCRulesConfig } from 'src/algorithms/QC/types'
import type { AuspiceJsonV2Extended } from 'src/algorithms/tree/types'
import type { TreeFinalizeThread } from 'src/workers/worker.treeAttachNodes'
import { AlgorithmSequenceStatus } from 'src/state/algorithm/algorithm.state'
import { treePreprocess } from 'src/algorithms/tree/treePreprocess'
import { treePostProcess } from 'src/algorithms/tree/treePostprocess'
import { deduplicateSeqName, sanitizeSequence } from 'src/algorithms/parseSequences'

/**
 * Implements a writable stream, which accepts parsed sequences and analyzes them
 */
export class AnalysisStream extends Writable {
  private readonly poolAnalyze: Pool<AnalyzeThread>
  private readonly threadTreeFinalize: TreeFinalizeThread

  private readonly rootSeq: string
  private readonly minimalLength: number
  private readonly geneMap: Gene[]
  private readonly auspiceData: AuspiceJsonV2Extended
  private readonly pcrPrimers: PcrPrimer[]
  private readonly qcRulesConfig: QCRulesConfig

  private readonly seqNames = new Map<string, number>()
  private readonly results: SequenceAnalysisStateWithMatch[] = []
  private readonly id: number = 0

  public constructor(poolAnalyze: Pool<AnalyzeThread>, threadTreeFinalize: TreeFinalizeThread, virus: Virus) {
    // We have to use `objectMode` in order to accepts parsed sequences in form of objects
    super({ objectMode: true })

    this.poolAnalyze = poolAnalyze
    this.threadTreeFinalize = threadTreeFinalize

    this.rootSeq = virus.rootSeq
    this.minimalLength = virus.minimalLength
    this.pcrPrimers = virus.pcrPrimers
    this.geneMap = virus.geneMap
    this.qcRulesConfig = virus.qcRulesConfig
    this.auspiceData = treePreprocess(virus.auspiceData)
  }

  /**
   * Catches duplicate names and renames if needed
   */
  private deduplicateSeqName(seqNameOrig: string) {
    return deduplicateSeqName(seqNameOrig, this.seqNames)
  }

  /**
   * Implements the writable stream interface. Will be called internally by the pipeline.
   * Receives an object with sequence name and sequence string and schedules the analysis.
   */
  // eslint-disable-next-line no-underscore-dangle
  public _write({ id: seqNameOrig, seq: seqOrig }: FastaObject, encoding: string, next: (error?: Error) => void) {
    const { id, rootSeq, minimalLength, pcrPrimers, geneMap, auspiceData, qcRulesConfig } = this
    const seqName = this.deduplicateSeqName(seqNameOrig)
    const seq = sanitizeSequence(seqOrig)

    // Schedule this sequence for the analysis on the worker thread pool
    this.poolAnalyze
      .queue(async (analyze: AnalyzeThread) =>
        analyze({
          seqName,
          seq,
          rootSeq,
          minimalLength,
          pcrPrimers,
          geneMap,
          auspiceData,
          qcRulesConfig,
        }),
      )
      // eslint-disable-next-line promise/always-return
      .then((result) => {
        this.results.push({
          seqName,
          id,
          errors: [],
          result,
          status: AlgorithmSequenceStatus.analysisDone,
        })

        next() // eslint-disable-line promise/no-callback-in-promise
      })
      .catch((error_: unknown) => {
        const error = sanitizeError(error_)
        console.error(
          `Error: in sequence "${seqName}": ${error.message}. This sequence will be excluded from further analysis.`,
        )

        this.results.push({
          seqName,
          id,
          errors: [error.message],
          result: undefined,
          status: AlgorithmSequenceStatus.analysisFailed,
        })

        next() // eslint-disable-line promise/no-callback-in-promise
      })
  }

  /**
   * Returns results after the analysis
   */
  public getResults() {
    return this.results
  }

  /**
   * Returns a tree with the analyzed sequences attached
   */
  public async finalizeTree() {
    if (!this.results) {
      throw new Error(`Error: cannot finalize tree: there are no analysis results available`)
    }

    const { auspiceData, rootSeq } = this
    const results = this.results.map((state) => state.result).filter(notUndefined)
    const auspiceDataFinal = await this.threadTreeFinalize({ auspiceData, results, rootSeq })
    const auspiceDataPostprocessed = treePostProcess(auspiceDataFinal)

    this.results.forEach((state) => {
      unset(state.result, 'nearestTreeNodeId')
    })

    return auspiceDataPostprocessed
  }
}
