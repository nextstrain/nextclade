import React, { forwardRef, useImperativeHandle } from 'react'
import styled from 'styled-components'
import type { StructureViewerHandle } from './types'

interface MolstarViewerProps {
  representationType: string
  onLoad?: () => void
  onError?: (error: Error) => void
}

export const MolstarViewer = forwardRef<StructureViewerHandle, MolstarViewerProps>(function MolstarViewer(_props, ref) {
  useImperativeHandle(
    ref,
    () => ({
      load: async () => {
        // Placeholder
      },
      setRepresentation: () => {
        // Placeholder
      },
      highlightResidues: () => {
        // Placeholder
      },
      clearHighlights: () => {
        // Placeholder
      },
      resetView: () => {
        // Placeholder
      },
      dispose: () => {
        // Placeholder
      },
    }),
    [],
  )

  return (
    <Container>
      <Placeholder>
        <Title>Mol* Viewer</Title>
        <Message>Coming soon</Message>
        <Description>Mol* integration is planned for a future release.</Description>
      </Placeholder>
    </Container>
  )
})

const Container = styled.div`
  width: 100%;
  height: 100%;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border: 1px dashed #ccc;
  border-radius: 8px;
`

const Placeholder = styled.div`
  text-align: center;
  color: #666;
`

const Title = styled.h3`
  margin: 0 0 8px;
  color: #333;
`

const Message = styled.p`
  font-size: 18px;
  margin: 0 0 4px;
`

const Description = styled.p`
  font-size: 14px;
  margin: 0;
  color: #999;
`
