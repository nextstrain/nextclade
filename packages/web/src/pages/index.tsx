/* eslint-disable array-func/no-unnecessary-this-arg */
import React, { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'
import { concurrent } from 'fasy'

import { createWorkerPools2 } from 'src/workers/createWorkerPools2'

export async function go() {
  const { thread, pool } = await createWorkerPools2()
  await thread.run('a')

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
