/* eslint-disable array-func/no-unnecessary-this-arg */
import React, { useEffect, useState } from 'react'

import { concurrent } from 'fasy'
import dynamic from 'next/dynamic'

import { createWorkerPools2 } from 'src/workers/createWorkerPools2'

// import { init, run } from 'src/workers/worker.wasm'

function Index() {
  const [value, setValue] = useState<number[]>()

  useEffect(() => {
    createWorkerPools2()
      .then(async ({ pool, thread }) => {
        // return [thread.run(module)]

        return concurrent.map(
          async () => pool.queue(async (worker) => worker.run()),
          Array.from({ length: 10 }, () => undefined),
        )
      })
      .then((val) => {
        setValue(val)
      })
      .catch(console.error)
  }, [])

  return <div>{value ?? 'Calculating...'}</div>
}

export default dynamic(() => Promise.resolve(Index), { ssr: false })
