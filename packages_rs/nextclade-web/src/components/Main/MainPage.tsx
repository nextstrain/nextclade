import React, { Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'

import { Layout } from 'src/components/Layout/Layout'
import Loading from 'src/components/Loading/Loading'

const MainInputForm = dynamic(() => import('src/components/Main/MainInputForm'), { ssr: false })

const SpinnerWrapper = styled.div`
  display: flex;
  flex-direction: row;
  margin: auto;
`

function SuspenseFallback() {
  return (
    <SpinnerWrapper>
      <Loading />
    </SpinnerWrapper>
  )
}

export function MainPage() {
  const fallback = useMemo(() => <SuspenseFallback />, [])

  return (
    <Layout>
      <Suspense fallback={fallback}>
        <MainInputForm />
      </Suspense>
    </Layout>
  )
}
