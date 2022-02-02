import React, { useEffect } from 'react'

import Head from 'next/head'

import { greet } from '../../../nextclade_rs_wasm/pkg/nextclade_wasm'

export default function Home() {
  useEffect(() => {
    greet()
  }, [])

  return (
    <div>
      <Head>
        <title>{'Nextclade'}</title>
        <meta name="description" content="Nextclade" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <p>{'Hello!'}</p>
    </div>
  )
}
