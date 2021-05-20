/* eslint-disable promise/always-return,array-func/no-unnecessary-this-arg */
import React, { useEffect, useState } from 'react'

import { concurrent } from 'fasy'
import { Pool, spawn, Worker } from 'threads'
import { connect } from 'react-redux'

import type { State } from 'src/state/reducer'
import type { ParseSeqResult } from 'src/workers/types'

import type {
  AnalysisWorker,
  AnalysisThread,
  NextcladeWasmParams,
  NextcladeResult,
} from 'src/workers/worker.analyze'

import {
  parseGeneMapGffString,
  parsePcrPrimersCsvString,
  parseQcConfigString,
  parseRefSequence,
  parseSequencesStreaming,
  treeFinalize,
  treePrepare,
} from 'src/workers/run'

import queryStr from '../../../../data/sars-cov-2/sequences.fasta'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import refFastaStr from '../../../../data/sars-cov-2/reference.fasta'
import qcConfigRaw from '../../../../data/sars-cov-2/qc.json'
import geneMapStrRaw from '../../../../data/sars-cov-2/genemap.gff'
import pcrPrimersStrRaw from '../../../../data/sars-cov-2/primers.csv'
import { algorithmRunAsync } from 'src/state/algorithm/algorithm.actions'

const DEFAULT_NUM_THREADS = 4
const numThreads = DEFAULT_NUM_THREADS // FIXME: detect number of threads

export async function go() {
  const refStr = await parseRefSequence(refFastaStr)
  const treePreparedStr = await treePrepare(JSON.stringify(treeJson), refStr)

  const geneMapName = 'genemap.gff'
  const pcrPrimersFilename = 'primers.csv'

  const geneMapStr = await parseGeneMapGffString(geneMapStrRaw, geneMapName)
  const qcConfigStr = await parseQcConfigString(JSON.stringify(qcConfigRaw))
  const pcrPrimersStr = await parsePcrPrimersCsvString(pcrPrimersStrRaw, pcrPrimersFilename, refStr)

  const poolAnalyze = Pool<AnalysisThread>(
    () => spawn<AnalysisWorker>(new Worker('src/workers/worker.analyze.ts', { name: 'worker.analyze' })),
    {
      size: numThreads,
      concurrency: 1,
      name: 'wasm',
      maxQueuedJobs: undefined,
    },
  )

  const params: NextcladeWasmParams = {
    refStr,
    geneMapStr,
    geneMapName,
    treePreparedStr,
    pcrPrimersStr,
    pcrPrimersFilename,
    qcConfigStr,
  }

  await concurrent.forEach(
    async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.init(params)),
    Array.from({ length: numThreads }, () => undefined),
  )

  const nextcladeResults: NextcladeResult[] = []
  const status = { parserDone: true, pendingAnalysis: 0 }

  function onSequence(seq: ParseSeqResult) {
    status.pendingAnalysis += 1
    console.log({ seq })

    poolAnalyze.queue((worker) => {
      return worker.analyze(seq).then((nextcladeResult) => {
        console.log({ nextcladeResult })
        nextcladeResults.push(nextcladeResult)
        status.pendingAnalysis -= 1
      })
    })
  }

  function onError(error: Error) {
    console.error(error)
  }

  function onComplete() {
    status.parserDone = true
  }

  await parseSequencesStreaming(queryStr, onSequence, onError, onComplete)

  await poolAnalyze.completed()
  await concurrent.forEach(
    async () => poolAnalyze.queue((worker: AnalysisThread) => worker.destroy()),
    Array.from({ length: numThreads }, () => undefined),
  )
  await poolAnalyze.terminate()

  const analysisResults = nextcladeResults.map((nextcladeResult) => nextcladeResult.analysisResult)
  const analysisResultsStr = JSON.stringify(analysisResults)
  const treeFinalStr = await treeFinalize(treePreparedStr, refStr, analysisResultsStr)

  console.log({ nextcladeResults })
  console.log({ tree: JSON.parse(treeFinalStr) })

  // return [result, ...poolResult].join(', ')
}

const mapStateToProps = (state: State) => ({})

const mapDispatchToProps = {
  algorithmRunAyncTrigger: algorithmRunAsync.trigger,
}

const Index = connect(mapStateToProps, mapDispatchToProps)(IndexDisconnected)
export default Index

export function IndexDisconnected({ algorithmRunAyncTrigger }) {
  const [value, setValue] = useState<number[]>()

  useEffect(() => {
    algorithmRunAyncTrigger()

    // go()
    //   .then((val) => {
    //     setValue(val)
    //   })
    //   .catch(console.error)
  }, [])

  return <div>{value ?? 'Calculating...'}</div>
}
