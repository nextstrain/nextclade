/* eslint-disable promise/always-return */
import React, { useEffect, useState } from 'react'

import type { NextcladeWasmParams, NextcladeWasmResult } from 'src/workers/worker.analyze'
import type { AlgorithmInput } from 'src/workers/worker.parse'
import { createWorkerPools } from 'src/workers/createWorkerPools'

import queryStr from '../../../../data/sars-cov-2/sequences.fasta'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import refFastaStr from '../../../../data/sars-cov-2/reference.fasta'
import qcConfig from '../../../../data/sars-cov-2/qc.json'
import geneMapStr from '../../../../data/sars-cov-2/genemap.gff'

export async function go() {
  const { threadTreePrepare, threadParse, poolAnalyze, threadTreeFinalize } = await createWorkerPools()

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
