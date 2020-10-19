import React, { useEffect, useState } from 'react'

import { createWorkerPools2 } from 'src/workers/createWorkerPools2'

export default function Index() {
  const [value, setValue] = useState<number>()

  useEffect(() => {
    createWorkerPools2()
      .then(async ({ pool, thread }) => {
        await thread.init()
        return thread.run()
      })
      .then((val) => {
        setValue(val)
      })
      .catch(console.error)
  }, [])

  return <div>{value ?? 'Calculating...'}</div>
}
