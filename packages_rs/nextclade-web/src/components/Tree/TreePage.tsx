import React from 'react'
import dynamic from 'next/dynamic'
import { Layout } from 'src/components/Layout/Layout'
import { LOADING } from 'src/components/Loading/Loading'

const TreePageContent = dynamic(() => import('src/components/Tree/TreePageContent'), {
  ssr: false,
  loading() {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{LOADING}</>
  },
})

export function TreePage() {
  return (
    <Layout>
      <TreePageContent />
    </Layout>
  )
}
