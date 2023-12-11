import React from 'react'
import { Layout } from 'src/components/Layout/Layout'
import { Landing } from 'src/components/Main/MainInputForm'
import styled from 'styled-components'

const Main = styled.div`
  display: flex;
  flex: 1 1 100%;
  overflow: hidden;
  padding: 0;
  margin: 0 auto;

  width: 100%;
  max-width: 1400px;
`

export function MainPage() {
  return (
    <Layout>
      <Main>
        <Landing />
      </Main>
    </Layout>
  )
}
