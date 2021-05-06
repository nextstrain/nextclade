import React, { useEffect, useState } from 'react'

import type { NextcladeResultWasm } from 'src/workers/worker.analyze'
import { createWorkerPools } from 'src/workers/createWorkerPools'

import queryStr from '../../../../data/sars-cov-2/sequences.fasta'
import treeJson from '../../../../data/sars-cov-2/tree.json'
import refFastaStr from '../../../../data/sars-cov-2/reference.fasta'

export async function go() {
  const { threadTreePrepare, threadParse, poolAnalyze, threadTreeFinalize } = await createWorkerPools()

  const treeStr = JSON.stringify(treeJson, null, 2)
  const treePreparedStr = await threadTreePrepare.run(treeStr, refFastaStr)

  const nextcladeResults: NextcladeResultWasm[] = []
  threadParse.values().subscribe((seq: any) => {
    console.log({ seq })
    poolAnalyze.queue(async (worker) =>
      worker.run(seq.index, seq.seqName, seq.seq, treePreparedStr)
        .then((nextcladeResult) => {
          console.log({ nextcladeResult })
          nextcladeResults.push(nextcladeResult)
          return nextcladeResult
        }))
  })

  console.log('threadParse.run')
  await threadParse.run(queryStr)

  const analysisResults = nextcladeResults.map(nextcladeResult => nextcladeResult.analysisResult)
  const analysisResultsStr = JSON.stringify(analysisResults)
  console.log('threadTreeFinalize.run')
  const treeFinalStr = await threadTreeFinalize.run(treePreparedStr, refFastaStr, analysisResultsStr)
  console.log('done')

  console.log({ tree: JSON.parse(treeFinalStr) })


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
