import React, { useEffect, useState } from 'react'

import Head from 'next/head'

import { greet } from 'src/gen/nextclade-wasm'

export default function Home() {
  const [foo, setFoo] = useState<string | undefined>(undefined)

  useEffect(() => {
    const foo = greet()
    setFoo(foo)
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
