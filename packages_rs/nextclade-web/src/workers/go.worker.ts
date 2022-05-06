/* eslint-disable promise/always-return */
import 'regenerator-runtime'

import { omit } from 'lodash'
import { sanitizeError } from 'src/helpers/sanitizeError'
import type { Thread } from 'threads'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'
import { expose } from 'threads/worker'

import type { FastaRecord, FastaRecordId, NextcladeResult } from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen/nextclade-wasm'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import { createAnalysisThreadPool, destroyAnalysisThreadPool, parseSequencesStreaming } from 'src/workers/run'

// Reports global analysis status to main thread
const analysisGlobalStatusObservable = new Subject<AlgorithmGlobalStatus>()

// Relays messages from fasta parser webworker to the main thread
const parsedFastaObservable = new Subject<FastaRecordId>()

// Relays results from analysis webworker pool to the main thread
const analysisResultsObservable = new Subject<NextcladeResult>()

export async function goWorker(numThreads: number, params: NextcladeParamsPojo, qryFastaStr: string) {
  analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.initWorkers)
  const pool = await createAnalysisThreadPool(numThreads, params)

  analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.started)
  await parseSequencesStreaming(
    qryFastaStr,
    (record: FastaRecord) => {
      parsedFastaObservable.next(omit(record, 'seq'))
      const task = pool.queue((thread) => thread.analyze(record))
      task
        .then((result) => {
          analysisResultsObservable.next(result)
        })
        .catch((error: unknown) => {
          analysisResultsObservable.error(sanitizeError(error))
        })
    },
    (error) => {
      analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.failed)
      parsedFastaObservable.error(error)
    },
    () => {
      parsedFastaObservable.complete()
    },
  )

  await pool.completed()
  await destroyAnalysisThreadPool(pool)
  analysisResultsObservable.complete()
  analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.done)
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
}

expose(worker)

export type GoWorker = typeof worker
export type GoThread = GoWorker & Thread
