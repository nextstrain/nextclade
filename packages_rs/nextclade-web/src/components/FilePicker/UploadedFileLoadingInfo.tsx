import React from 'react'

import { FlexCenter } from 'src/components/FilePicker/FilePickerStyles'
import styled from 'styled-components'
import { ThreeDots } from 'react-loader-spinner'

const Container = styled.div`
  display: flex;
  flex: 1 0 100%;
  flex-grow: 1;
  border: ${(props) => props.theme.filePicker.border.normal};
  border-radius: ${(props) => props.theme.filePicker.borderRadius};
`

export function UploadedFileLoadingInfo() {
  return (
    <Container>
      <FlexCenter className="m-auto">
        <ThreeDots width={20} height={20} color="#aaa" />
      </FlexCenter>
    </Container>
  )
}
