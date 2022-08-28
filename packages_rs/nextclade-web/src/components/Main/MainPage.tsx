import React, { HTMLProps, Suspense, useMemo } from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { ThreeDots } from 'react-loader-spinner'

import { LayoutMain } from 'src/components/Layout/LayoutMain'
import { MainSectionInfo } from 'src/components/Main/MainSectionInfo'
import { MainSectionTitle } from 'src/components/Main/MainSectionTitle'
import { TeamCredits } from 'src/components/Team/TeamCredits'

const MainInputForm = dynamic(() => import('src/components/Main/MainInputForm'), { ssr: false })

const SpinnerWrapper = styled.div<HTMLProps<HTMLDivElement>>`
  width: 100%;
  height: 822px;
  display: flex;
`

const SpinnerWrapperInternal = styled.div`
  margin: auto;
`

const Spinner = styled(ThreeDots)`
  flex: 1;
  margin: auto;
  height: 100%;
`

function Loading() {
  return (
    <SpinnerWrapper>
      <SpinnerWrapperInternal>
        <Spinner color="#aaa" width={20} height={20} />
      </SpinnerWrapperInternal>
    </SpinnerWrapper>
  )
}

export function MainPage() {
  const fallback = useMemo(() => <Loading />, [])

  return (
    <LayoutMain>
      <MainSectionTitle />
      <Suspense fallback={fallback}>
        <MainInputForm />
      </Suspense>
      <MainSectionInfo />
      <TeamCredits />
    </LayoutMain>
  )
}
