/* eslint-disable promise/always-return */
import React, { useEffect, useState } from 'react'

import type { NextcladeResultWasm } from 'src/workers/worker.analyze'
import { createWorkerPools } from 'src/workers/createWorkerPools'

import queryStr from '../../../../data/sars-cov-2/sequences.fasta'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import refFastaStr from '../../../../data/sars-cov-2/reference.fasta'

export interface AlgorithmInput {
  index: number
  seqName: string
  seq: string
  treePreparedStr: string
}

export async function go() {
  const { threadTreePrepare, threadParse, poolAnalyze, threadTreeFinalize } = await createWorkerPools()

  const treeStr = JSON.stringify(treeJson, null, 2)
  const treePreparedStr: string = await threadTreePrepare.run(treeStr, refFastaStr)

  const nextcladeResults: NextcladeResultWasm[] = []
  const status = { parserDone: true, pendingAnalysis: 0 }

  function onSequence(seq: AlgorithmInput) {
    status.pendingAnalysis += 1
    console.log({ seq })
    poolAnalyze.queue((worker) =>
      worker.run(seq.index, seq.seqName, seq.seq, treePreparedStr).then((nextcladeResult) => {
        console.log({ nextcladeResult })
        nextcladeResults.push(nextcladeResult)
        status.pendingAnalysis -= 1
      }),
    )
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
  const treeFinalStr = await threadTreeFinalize.run(treePreparedStr, refFastaStr, analysisResultsStr)

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
