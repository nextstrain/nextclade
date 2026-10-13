import React from 'react'
import { Layout } from 'src/components/Layout/Layout'
import { Landing } from 'src/components/Main/MainInputForm'
import styled from 'styled-components'

/** Scrolls the whole page width, so that the scrollbar stays on the page edge */
const Main = styled.div`
  display: flex;
  flex: 1 1 100%;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0;
  margin: 0;
  width: 100%;
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
