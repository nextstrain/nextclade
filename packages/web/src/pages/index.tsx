/* eslint-disable promise/always-return */
import React, { useEffect, useState } from 'react'

import { concurrent } from 'fasy'
import { Pool, spawn, Worker } from 'threads'

import type { AlgorithmInput, ParseThread } from 'src/workers/worker.parse'
import type {
  AnalysisWorker,
  AnalysisThread,
  NextcladeWasmParams,
  NextcladeWasmResult,
} from 'src/workers/worker.analyze'
import type { TreePrepareThread } from 'src/workers/worker.treePrepare'
import type { TreeFinalizeThread } from 'src/workers/worker.treeFinalize'

import queryStr from '../../../../data/sars-cov-2/sequences.fasta'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import refFastaStr from '../../../../data/sars-cov-2/reference.fasta'
import qcConfig from '../../../../data/sars-cov-2/qc.json'
import geneMapStr from '../../../../data/sars-cov-2/genemap.gff'

const DEFAULT_NUM_THREADS = 4
const numThreads = DEFAULT_NUM_THREADS // FIXME: detect number of threads

export async function go() {
  const threadTreePrepare = await spawn<TreePrepareThread>(new Worker('src/workers/worker.treePrepare.ts', { name: 'worker.treePrepare' })) // prettier-ignore
  await threadTreePrepare.init()

  const threadParse = await spawn<ParseThread>(new Worker('src/workers/worker.parse.ts', { name: 'worker.parse' }))
  await threadParse.init()

  const poolAnalyze = Pool<AnalysisThread>(
    () => spawn<AnalysisWorker>(new Worker('src/workers/worker.analyze.ts', { name: 'worker.analyze' })),
    {
      size: numThreads,
      concurrency: 1,
      name: 'wasm',
      maxQueuedJobs: undefined,
    },
  )

  await concurrent.forEach(
    async () => poolAnalyze.queue(async (worker: AnalysisThread) => worker.init()),
    Array.from({ length: numThreads }, () => undefined),
  )

  const threadTreeFinalize = await spawn<TreeFinalizeThread>(new Worker('src/workers/worker.treeFinalize.ts', { name: 'worker.treeFinalize' })) // prettier-ignore
  await threadTreeFinalize.init()

  const refParsed: AlgorithmInput = await threadParse.parseRefSequence(refFastaStr)
  const refStr = refParsed.seq

  const treeStr = JSON.stringify(treeJson, null, 2)
  const treePreparedStr: string = await threadTreePrepare.run(treeStr, refStr)

  const nextcladeResults: NextcladeWasmResult[] = []
  const status = { parserDone: true, pendingAnalysis: 0 }

  const geneMapName = 'genemap.gff'
  const pcrPrimersStr = ''
  const qcConfigStr = JSON.stringify(qcConfig)

  function onSequence(seq: AlgorithmInput) {
    status.pendingAnalysis += 1
    console.log({ seq })

    poolAnalyze.queue((worker) => {
      const params: NextcladeWasmParams = {
        index: seq.index,
        queryName: seq.seqName,
        queryStr: seq.seq,
        refStr,
        geneMapStr,
        geneMapName,
        treePreparedStr,
        pcrPrimersStr,
        qcConfigStr,
      }

      return worker.run(params).then((nextcladeResult) => {
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

  const subscription = threadParse.values().subscribe(onSequence, onError, onComplete)
  await threadParse.run(queryStr)

  await poolAnalyze.settled()
  await poolAnalyze.terminate()

  const analysisResults = nextcladeResults.map((nextcladeResult) => nextcladeResult.analysisResult)
  const analysisResultsStr = JSON.stringify(analysisResults)
  const treeFinalStr = await threadTreeFinalize.run(treePreparedStr, refStr, analysisResultsStr)

  console.log({ nextcladeResults })
  console.log({ tree: JSON.parse(treeFinalStr) })

  await subscription.unsubscribe()

  // return [result, ...poolResult].join(', ')
}

export default function Index() {
  const [value, setValue] = useState<number[]>()

  useEffect(() => {
    go()
      .then((val) => {
        setValue(val)
      })
      .catch(console.error)
  }, [])

  return <div>{value ?? 'Calculating...'}</div>
}
