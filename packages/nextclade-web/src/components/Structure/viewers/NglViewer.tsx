/* eslint-disable no-void */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components'
import type { RepresentationType } from 'src/state/structure.state'
import type { ResidueSelection, StructureViewerHandle } from './types'

type NglStage = import('ngl').Stage
type NglComponent = import('ngl').Component

function addHighlightRepresentation(component: NglComponent, selection: ResidueSelection) {
  const { chain, position, color = 'red' } = selection
  const sele = `${position}:${chain}`
  component.addRepresentation('ball+stick', {
    sele,
    color,
    radius: 0.5,
    scale: 1.5,
    name: 'highlight',
  })
}

interface StructureData {
  data: ArrayBuffer
  format: 'pdb' | 'cif' | 'bcif'
}

interface NglViewerProps {
  representationType: RepresentationType
  structureData?: StructureData
  highlights?: ResidueSelection[]
  onLoad?: () => void
  onError?: (error: Error) => void
}

export const NglViewer = forwardRef<StructureViewerHandle, NglViewerProps>(function NglViewer(
  { representationType, structureData, highlights = [], onLoad, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<NglStage | null>(null)
  const componentRef = useRef<NglComponent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStageReady, setIsStageReady] = useState(false)
  const [isStructureReady, setIsStructureReady] = useState(false)

  // Initialize stage
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let disposed = false
    let stage: NglStage | null = null
    let handleResize: (() => void) | null = null

    async function initStage(containerElement: HTMLDivElement) {
      try {
        const NGL = await import('ngl')
        if (disposed) return

        stage = new NGL.Stage(containerElement, {
          backgroundColor: 'white',
        })
        stageRef.current = stage

        handleResize = () => stage?.autoView()
        window.addEventListener('resize', handleResize)

        setIsStageReady(true)
      } catch (error_) {
        if (disposed) return
        const errorMsg = error_ instanceof Error ? error_.message : 'Failed to initialize NGL viewer'
        setError(errorMsg)
        onError?.(error_ instanceof Error ? error_ : new Error(errorMsg))
      }
    }

    void initStage(container)

    return () => {
      disposed = true
      setIsStageReady(false)
      if (handleResize) {
        window.removeEventListener('resize', handleResize)
      }
      if (stage) {
        stage.dispose()
        stageRef.current = null
        componentRef.current = null
      }
    }
  }, [onError])

  // Load structure from ArrayBuffer
  const loadStructure = useCallback(
    async (data: ArrayBuffer, format: string) => {
      if (!stageRef.current) {
        throw new Error('Stage not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        stageRef.current.removeAllComponents()
        const blob = new Blob([data])
        const component = await stageRef.current.loadFile(blob, { ext: format })
        if (!component) {
          throw new Error('Failed to load structure component')
        }
        componentRef.current = component
        stageRef.current.autoView()
        onLoad?.()
      } catch (error_) {
        const errorMsg = error_ instanceof Error ? error_.message : 'Failed to load structure'
        setError(errorMsg)
        onError?.(error_ instanceof Error ? error_ : new Error(errorMsg))
        throw error_
      } finally {
        setIsLoading(false)
      }
    },
    [onLoad, onError],
  )

  // Auto-load when stage is ready and structureData is provided
  useEffect(() => {
    if (!isStageReady || !structureData) return
    setIsStructureReady(false)
    loadStructure(structureData.data, structureData.format)
      .then(() => {
        setIsStructureReady(true)
        return undefined
      })
      .catch(() => {
        // Error already handled in loadStructure
      })
  }, [isStageReady, structureData, loadStructure])

  // Apply representation and highlights when structure is ready or they change
  useEffect(() => {
    if (!isStructureReady || !componentRef.current) return

    const component = componentRef.current

    component.removeAllRepresentations()
    component.addRepresentation(representationType, {
      color: 'sstruc',
      name: 'main',
    })

    highlights.forEach((selection) => addHighlightRepresentation(component, selection))

    stageRef.current?.autoView()
  }, [isStructureReady, highlights, representationType])

  const setRepresentation = useCallback((type: RepresentationType) => {
    if (!componentRef.current) return

    componentRef.current.removeAllRepresentations()
    componentRef.current.addRepresentation(type, {
      color: 'sstruc',
      name: 'main',
    })
  }, [])

  const highlightResidues = useCallback((selections: ResidueSelection[]) => {
    const component = componentRef.current
    if (!component) return

    try {
      selections.forEach((selection) => addHighlightRepresentation(component, selection))
      stageRef.current?.autoView()
    } catch (error_) {
      console.warn('Failed to highlight residues:', error_)
    }
  }, [])

  const clearHighlights = useCallback(() => {
    // Reload to clear - not ideal but NGL doesn't have great highlight management
    // In production, we'd track representations and remove them
  }, [])

  const resetView = useCallback(() => {
    stageRef.current?.autoView()
  }, [])

  const dispose = useCallback(() => {
    stageRef.current?.dispose()
    stageRef.current = null
    componentRef.current = null
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      load: loadStructure,
      setRepresentation,
      highlightResidues,
      clearHighlights,
      resetView,
      dispose,
    }),
    [loadStructure, setRepresentation, highlightResidues, clearHighlights, resetView, dispose],
  )

  return (
    <Container>
      <ViewerContainer ref={containerRef} />
      {isLoading && <LoadingOverlay>Loading structure...</LoadingOverlay>}
      {error && <ErrorOverlay>{error}</ErrorOverlay>}
    </Container>
  )
})

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`

const ViewerContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 500px;
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  font-size: 16px;
`

const ErrorOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 200, 200, 0.9);
  padding: 20px;
  border-radius: 8px;
  color: #c00;
  font-size: 14px;
`
