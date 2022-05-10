/* eslint-disable promise/always-return */
import 'regenerator-runtime'
import { AuspiceJsonV2 } from 'auspice'

import { omit } from 'lodash'
import type { Thread } from 'threads'
import { Observable as ThreadsObservable, Subject } from 'threads/observable'
import { expose } from 'threads/worker'

import type { AnalysisOutput, AnalysisResult, FastaRecord, FastaRecordId, NextcladeResult } from 'src/algorithms/types'
import type { NextcladeParamsPojo } from 'src/gen/nextclade-wasm'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'
import {
  createAnalysisThreadPool,
  destroyAnalysisThreadPool,
  getFirstWorker,
  parseSequencesStreaming,
} from 'src/workers/run'

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

  const results: AnalysisResult[] = []

  analysisGlobalStatusObservable.next(AlgorithmGlobalStatus.started)
  await parseSequencesStreaming(
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

  const worker = await getFirstWorker(pool)
  const treeStr = await worker.getOutputTree(JSON.stringify(results))
  treeObservable.next(JSON.parse(treeStr) as AuspiceJsonV2)

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
  getTreeObservable(): ThreadsObservable<AuspiceJsonV2> {
    return ThreadsObservable.from(treeObservable)
  },
}

expose(worker)

export type GoWorker = typeof worker
export type GoThread = GoWorker & Thread
