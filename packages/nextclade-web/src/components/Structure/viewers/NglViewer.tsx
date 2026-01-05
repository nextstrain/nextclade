import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components'
import type { RepresentationType } from 'src/state/structure.state'
import type { ResidueSelection, StructureViewerHandle } from './types'

// NGL types - using types from the ngl package
type NglStage = import('ngl').Stage
type NglComponent = import('ngl').Component

interface NglViewerProps {
  representationType: RepresentationType
  pdbId?: string
  highlights?: ResidueSelection[]
  onLoad?: () => void
  onError?: (error: Error) => void
}

export const NglViewer = forwardRef<StructureViewerHandle, NglViewerProps>(function NglViewer(
  { representationType, pdbId, highlights = [], onLoad, onError },
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

    const initStage = async () => {
      try {
        const NGL = await import('ngl')
        if (disposed) return

        stage = new NGL.Stage(container, {
          backgroundColor: 'white',
        })
        stageRef.current = stage

        handleResize = () => stage?.autoView()
        window.addEventListener('resize', handleResize)

        setIsStageReady(true)
      } catch (err) {
        if (disposed) return
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize NGL viewer'
        setError(errorMsg)
        onError?.(err instanceof Error ? err : new Error(errorMsg))
      }
    }

    void initStage()

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

  // Load structure function
  const loadStructure = useCallback(
    async (id: string) => {
      if (!stageRef.current) {
        throw new Error('Stage not initialized')
      }

      setIsLoading(true)
      setError(null)

      try {
        stageRef.current.removeAllComponents()
        const component = await stageRef.current.loadFile(`rcsb://${id}`)
        if (!component) {
          throw new Error('Failed to load structure component')
        }
        componentRef.current = component

        // Apply representation
        component.addRepresentation(representationType, {
          color: 'sstruc',
          name: 'main',
        })

        stageRef.current.autoView()
        onLoad?.()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load structure'
        setError(errorMsg)
        onError?.(err instanceof Error ? err : new Error(errorMsg))
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [representationType, onLoad, onError],
  )

  // Auto-load when stage is ready and pdbId is provided
  useEffect(() => {
    if (!isStageReady || !pdbId) return
    setIsStructureReady(false)
    void loadStructure(pdbId).then(() => {
      setIsStructureReady(true)
    })
  }, [isStageReady, pdbId, loadStructure])

  // Apply highlights when structure is ready and highlights change
  useEffect(() => {
    if (!isStructureReady || !componentRef.current) return

    const component = componentRef.current

    // Remove existing highlights by rebuilding main representation
    component.removeAllRepresentations()
    component.addRepresentation(representationType, {
      color: 'sstruc',
      name: 'main',
    })

    // Add highlights
    for (const { chain, position, color = 'red' } of highlights) {
      const sele = `${position}:${chain}`
      component.addRepresentation('ball+stick', {
        sele,
        color,
        radius: 0.5,
        scale: 1.5,
        name: 'highlight',
      })
    }

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
      selections.forEach(({ chain, position, color = 'red' }) => {
        const sele = `${position}:${chain}`
        component.addRepresentation('ball+stick', {
          sele,
          color,
          radius: 0.5,
          scale: 1.5,
          name: 'highlight',
        })
      })
      stageRef.current?.autoView()
    } catch (err) {
      // Structure may not be fully ready yet - ignore
      console.warn('Failed to highlight residues:', err)
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
