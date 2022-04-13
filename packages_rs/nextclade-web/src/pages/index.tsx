import React, { useEffect, useState } from 'react'

import Head from 'next/head'
import { createAnalysisThreadPool, destroyAnalysisThreadPool, parseSequencesStreaming } from 'src/run'

import qryFastaStr from '../../../../data_dev/sequences.fasta'

const numThreads = 2

export default function Home() {
  const [foo, setFoo] = useState<string | undefined>(undefined)

  useEffect(() => {
    // const params = NextcladeParams.from_js({ foo: 42 })
    // const input = AnalysisInput.from_js({ bar: 'Hello!' })
    // const nextclade = new NextcladeWasm(params)
    // const result = nextclade.run(input)

    parseSequencesStreaming(
      qryFastaStr,
      (seq) => {
        console.log(seq.index, seq.seqName, seq.seq.slice(0, 10))
      },
      (error) => {
        console.error(error)
      },
      () => {
        console.log('Completed')
      },
    )

    createAnalysisThreadPool(numThreads)
      .then((pool) => {
        const task = pool.queue((thread) => thread.run())
        task.then((result) => {
          console.log({ result })
          setFoo(JSON.stringify(result, null, 2))
        })
        return pool
      })
      .then((pool) => {
        destroyAnalysisThreadPool(pool)
      })

    // result.free()
    // nextclade.free()
    // params.free()
    // input.free()
  }, [])

  return (
    <div>
      <Head>
        <title>{'Nextclade'}</title>
        <meta name="description" content="Nextclade" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <p>{foo}</p>
    </div>
  )
}
