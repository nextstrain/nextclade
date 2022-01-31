import React from 'react'

import { FlexCenter } from 'src/components/FilePicker/FilePickerStyles'
import styled from 'styled-components'

import { Spinner } from 'src/components/Common/Spinner'

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
        <Spinner type="ThreeDots" size={20} color="#aaa" />
      </FlexCenter>
    </Container>
  )
}
