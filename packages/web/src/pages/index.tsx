/* eslint-disable array-func/no-unnecessary-this-arg */
import React, { useEffect, useState } from 'react'

// import dynamic from 'next/dynamic'
// import { concurrent } from 'fasy'

import queryStr from '../../../../data/sars-cov-2/sequences.fasta'

import { createWorkerPools2 } from 'src/workers/createWorkerPools2'

export async function go() {
  const { threadParse, threadWasm } = await createWorkerPools2()

  threadParse.values().subscribe((seq: any) => {
    console.log({ seq })
    threadWasm.run(seq.index, seq.seqName, seq.seq).then((res) => {
      console.log({ res })
    })
  })

  await threadParse.run(queryStr)

  // const poolResult = await concurrent.map(
  //   async (_0, i) => pool.queue(async (worker) => worker.run(i)),
  //   Array.from({ length: 10 }, () => undefined),
  // )

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
