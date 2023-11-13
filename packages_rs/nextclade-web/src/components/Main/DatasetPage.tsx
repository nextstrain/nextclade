import React from 'react'
import styled from 'styled-components'
import { Layout } from 'src/components/Layout/Layout'
import { StepDatasetSelection } from 'src/components/Main/StepDatasetSelection'

const Main = styled.div`
  display: flex;
  flex: 1 1 100%;
  overflow: hidden;
  padding: 0;
  margin: 0 auto;

  width: 100%;
  max-width: 1400px;
`

export function DatasetPage() {
  return (
    <Layout>
      <Main>
        <StepDatasetSelection />
      </Main>
    </Layout>
  )
}
