/* eslint-disable promise/always-return */
import 'regenerator-runtime'

import type { AuspiceJsonV2 } from 'auspice'
import type { Thread } from 'threads'
import { omit } from 'lodash'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'
import { expose } from 'threads/worker'

import type { AnalysisResult, FastaRecord, FastaRecordId, NextcladeResult } from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen/nextclade-wasm'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { createAnalysisThreadPool, destroyAnalysisThreadPool, FastaParser } from 'src/workers/run'

// Reports global analysis status to main thread
const analysisGlobalStatusObservable = new Subject<AlgorithmGlobalStatus>()

// Relays messages from fasta parser webworker to the main thread
const parsedFastaObservable = new Subject<FastaRecordId>()

// Relays results from analysis webworker pool to the main thread
const analysisResultsObservable = new Subject<NextcladeResult>()

// Relays tree result from webworker to the main thread
const treeObservable = new Subject<AuspiceJsonV2>()

export async function goWorker(numThreads: number, params: NextcladeParamsPojo, qryFastaStr: string) {
  analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.initWorkers)

  const pool = await createAnalysisThreadPool(numThreads, params)

  const fastaParser = await FastaParser.create()

  try {
    const results: AnalysisResult[] = []

    analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.started)

    await fastaParser.parseSequencesStreaming(
      qryFastaStr,
      (record: FastaRecord) => {
        parsedFastaObservable.next(omit(record, 'seq'))
        const task = pool.queue((thread) => thread.analyze(record))
        task
          .then((result) => {
            analysisResultsObservable.next(result)
            if (result.result) {
              results.push(result.result.analysisResult)
            }
          })
          .catch((error: unknown) => {
            analysisResultsObservable.error(sanitizeError(error))
            void fastaParser.destroy() // eslint-disable-line no-void
            void destroyAnalysisThreadPool(pool) // eslint-disable-line no-void
          })
      },
      (error) => {
        analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.failed)
        parsedFastaObservable.error(error)
        void fastaParser.destroy() // eslint-disable-line no-void
        void destroyAnalysisThreadPool(pool) // eslint-disable-line no-void
      },
      () => {
        parsedFastaObservable.complete()
      },
    )

    await pool.completed()

    await pool.queue((thread) =>
      thread
        .getOutputTree(JSON.stringify(results))
        .then((treeStr) => {
          treeObservable.next(JSON.parse(treeStr) as AuspiceJsonV2)
        })
        .catch((error: unknown) => {
          treeObservable.error(error)
          void fastaParser.destroy() // eslint-disable-line no-void
          void destroyAnalysisThreadPool(pool) // eslint-disable-line no-void
        }),
    )

    analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.done)
    analysisResultsObservable.complete()
  } catch (error: unknown) {
    analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.failed)
    analysisResultsObservable.error(error)
  } finally {
    void fastaParser.destroy() // eslint-disable-line no-void
    void destroyAnalysisThreadPool(pool) // eslint-disable-line no-void
  }
}

// noinspection JSUnusedGlobalSymbols
const worker = {
  goWorker,
  getAnalysisGlobalStatusObservable(): ThreadsObservable<AlgorithmGlobalStatus> {
    return ThreadsObservable.from(analysisGlobalStatusObservable)
  },
  getParsedFastaObservable(): ThreadsObservable<FastaRecordId> {
    return ThreadsObservable.from(parsedFastaObservable)
  },
  getAnalysisResultsObservable(): ThreadsObservable<NextcladeResult> {
    return ThreadsObservable.from(analysisResultsObservable)
  },
  getTreeObservable(): ThreadsObservable<AuspiceJsonV2> {
    return ThreadsObservable.from(treeObservable)
  },
}

expose(worker)

export type GoWorker = typeof worker
export type GoThread = GoWorker & Thread
