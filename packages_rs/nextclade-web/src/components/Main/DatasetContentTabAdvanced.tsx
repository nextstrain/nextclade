import React from 'react'
import styled from 'styled-components'
import { FilePickerAdvanced } from 'src/components/FilePicker/FilePickerAdvanced'
import AdvancedModeExplanationContent from 'src/components/Main/AdvancedModeExplanation.mdx'

export function DatasetContentTabAdvanced() {
  return (
    <Container>
      <Header>
        <AdvancedModeExplanationWrapper>
          <AdvancedModeExplanationContent />
        </AdvancedModeExplanationWrapper>
      </Header>

      <Main>
        <FilePickerAdvanced />
      </Main>
    </Container>
  )
}

export const AdvancedModeExplanationWrapper = styled.div`
  > p {
    margin: 0;
  }
`

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Header = styled.div`
  flex: 0;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
  width: 100%;
`
