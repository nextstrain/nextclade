/* eslint-disable no-void */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components'
import type { RepresentationType } from 'src/state/structure.state'
import type { ResidueSelection, StructureViewerHandle } from './types'

// Use PluginUIContext instead of the full Viewer app to avoid Node.js dependencies
type PluginUIContext = import('molstar/lib/mol-plugin-ui/context').PluginUIContext

const REPRESENTATION_MAP: Record<RepresentationType, string> = {
  'cartoon': 'cartoon',
  'surface': 'gaussian-surface',
  'ball+stick': 'ball-and-stick',
  'spacefill': 'spacefill',
  'licorice': 'ball-and-stick',
}

interface StructureData {
  data: ArrayBuffer
  format: 'pdb' | 'cif' | 'bcif'
}

interface MolstarViewerProps {
  representationType: RepresentationType
  structureData?: StructureData
  highlights?: ResidueSelection[]
  onLoad?: () => void
  onError?: (error: Error) => void
}

export const MolstarViewer = forwardRef<StructureViewerHandle, MolstarViewerProps>(function MolstarViewer(
  { representationType, structureData, highlights = [], onLoad, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pluginRef = useRef<PluginUIContext | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [isViewerReady, setIsViewerReady] = useState(false)
  const [isStructureReady, setIsStructureReady] = useState(false)

  // Initialize plugin
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    let disposed = false
    let plugin: PluginUIContext | undefined

    async function initPlugin(containerElement: HTMLDivElement) {
      try {
        // Import browser-compatible modules (avoids MP4 export which requires Node.js fs)
        const { createPluginUI } = await import('molstar/lib/mol-plugin-ui')
        const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18')
        const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec')

        if (disposed) return

        const defaultSpec = DefaultPluginUISpec()
        plugin = await createPluginUI({
          target: containerElement,
          spec: {
            ...defaultSpec,
            // Disable remote state to prevent external requests
            components: {
              ...defaultSpec.components,
              remoteState: 'none',
            },
            layout: {
              initial: {
                isExpanded: false,
                showControls: true,
                regionState: {
                  bottom: 'full',
                  left: 'collapsed',
                  right: 'hidden',
                  top: 'full',
                },
              },
            },
          },
          render: renderReact18,
        })

        if (disposed) {
          plugin.dispose()
          return
        }

        pluginRef.current = plugin

        // Trigger initial resize after a short delay to ensure container is sized
        setTimeout(() => {
          if (pluginRef.current) {
            pluginRef.current.layout.events.updated.next(undefined)
          }
        }, 100)

        setIsViewerReady(true)
      } catch (error_) {
        if (disposed) return
        const errorMsg = error_ instanceof Error ? error_.message : 'Failed to initialize Mol* viewer'
        setError(errorMsg)
        onError?.(error_ instanceof Error ? error_ : new Error(errorMsg))
      }
    }

    void initPlugin(container)

    return () => {
      disposed = true
      setIsViewerReady(false)
      if (plugin) {
        plugin.dispose()
        pluginRef.current = undefined
      }
    }
  }, [onError])

  // Load structure from ArrayBuffer
  const loadStructure = useCallback(
    async (data: ArrayBuffer, format: string) => {
      const plugin = pluginRef.current
      if (!plugin) {
        throw new Error('Plugin not initialized')
      }

      setIsLoading(true)
      setError(undefined)

      try {
        const { StateTransforms } = await import('molstar/lib/mol-plugin-state/transforms')

        // Clear existing structures
        await plugin.clear()

        const state = plugin.state.data
        let tree

        if (format === 'pdb') {
          // PDB format: decode to string, then parse
          const decoder = new TextDecoder('utf-8')
          const pdbString = decoder.decode(data)
          tree = state
            .build()
            .toRoot()
            .apply(StateTransforms.Data.RawData, { data: pdbString, label: 'structure' })
            .apply(StateTransforms.Model.TrajectoryFromPDB)
        } else {
          // mmCIF/bcif format: binary data -> parse CIF -> trajectory
          tree = state
            .build()
            .toRoot()
            .apply(StateTransforms.Data.RawData, { data: new Uint8Array(data), label: 'structure' })
            .apply(StateTransforms.Data.ParseCif)
            .apply(StateTransforms.Model.TrajectoryFromMmCif)
        }

        await plugin.runTask(state.updateTree(tree))

        // Apply default preset to the trajectory
        const trajectories = plugin.managers.structure.hierarchy.current.trajectories
        if (trajectories.length > 0) {
          await plugin.builders.structure.hierarchy.applyPreset(trajectories[0].cell, 'default')
        }

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

  // Auto-load when viewer is ready and structureData is provided
  useEffect(() => {
    if (!isViewerReady || !structureData) return
    setIsStructureReady(false)
    loadStructure(structureData.data, structureData.format)
      .then(() => {
        setIsStructureReady(true)
        return undefined
      })
      .catch(() => {
        // Error already handled in loadStructure
      })
  }, [isViewerReady, structureData, loadStructure])

  // Apply representation when structure is ready or representation changes
  useEffect(() => {
    if (!isStructureReady || !pluginRef.current) return

    const plugin = pluginRef.current
    const { structures } = plugin.managers.structure.hierarchy.current
    if (structures.length === 0) return

    const molstarType = REPRESENTATION_MAP[representationType]

    // Update representation for each structure's components
    // Note: Full representation type switching requires complex state manipulation
    // For now, we update the color theme. The molstarType variable is prepared for future use.
    void molstarType
    structures.forEach((structureRef) => {
      const { components } = structureRef
      if (components.length > 0) {
        void plugin.managers.structure.component.updateRepresentationsTheme(components, {
          color: 'chain-id',
        })
      }
    })
  }, [isStructureReady, representationType])

  // Apply highlights when structure is ready or highlights change
  useEffect(() => {
    if (!isStructureReady || !pluginRef.current) return

    const plugin = pluginRef.current

    // Highlight mutation residues with red overpaint + focus representation
    void (async () => {
      try {
        const { Script } = await import('molstar/lib/mol-script/script')
        const { StructureSelection, StructureElement } = await import('molstar/lib/mol-model/structure')
        const { Color } = await import('molstar/lib/mol-util/color')
        const { StateTransforms } = await import('molstar/lib/mol-plugin-state/transforms')

        // Clear previous focus
        plugin.managers.structure.focus.clear()

        const { structures } = plugin.managers.structure.hierarchy.current
        if (structures.length === 0) return

        const structureRef = structures[0]
        const structure = structureRef.cell.obj?.data
        if (!structure) return

        // Clear existing overpaint by updating with empty layers
        for (const component of structureRef.components) {
          for (const repr of component.representations) {
            const state = plugin.state.data
            const overpaintNode = state.select(repr.cell.transform.ref).find(
              (n) => n.transform.transformer === StateTransforms.Representation.OverpaintStructureRepresentation3DFromBundle,
            )
            if (overpaintNode) {
              const update = state.build().to(overpaintNode).update({ layers: [] })
              await plugin.runTask(state.updateTree(update))
            }
          }
        }

        if (highlights.length === 0) return

        // Build selection for all mutation residues
        const sel = Script.getStructureSelection(
          (Q) => {
            const tests = highlights.map(({ chain, position }) =>
              Q.core.logic.and([
                Q.core.rel.eq([Q.struct.atomProperty.macromolecular.auth_asym_id(), chain]),
                Q.core.rel.eq([Q.struct.atomProperty.macromolecular.auth_seq_id(), position]),
              ]),
            )
            return Q.struct.generator.atomGroups({
              'residue-test': tests.length === 1 ? tests[0] : Q.core.logic.or(tests),
            })
          },
          structure,
        )

        if (StructureSelection.isEmpty(sel)) return

        const loci = StructureSelection.toLociWithSourceUnits(sel)

        // Create overpaint layer with red color for mutations
        const bundle = StructureElement.Bundle.fromLoci(loci)
        const layer = {
          bundle,
          color: Color(0xff0000), // Red
          clear: false,
        }

        // Apply overpaint to all representations
        for (const component of structureRef.components) {
          for (const repr of component.representations) {
            const state = plugin.state.data
            const update = state
              .build()
              .to(repr.cell.transform.ref)
              .apply(StateTransforms.Representation.OverpaintStructureRepresentation3DFromBundle, { layers: [layer] })
            await plugin.runTask(state.updateTree(update))
          }
        }

        // Also show focus representation (ball-and-stick) for the mutations
        plugin.managers.structure.focus.setFromLoci(loci)

        // Center camera on mutations
        plugin.managers.camera.focusLoci(loci)
      } catch (error) {
        console.warn('Failed to highlight mutations:', error)
      }
    })()
  }, [isStructureReady, highlights])

  const setRepresentation = useCallback((_type: RepresentationType) => {
    // Representation changes are handled by the useEffect above
    // This method is kept for interface compatibility
  }, [])

  const highlightResidues = useCallback((_selections: ResidueSelection[]) => {
    // Highlighting is handled by the useEffect above
    // This method is kept for interface compatibility
  }, [])

  const clearHighlights = useCallback(() => {
    const plugin = pluginRef.current
    if (!plugin) return

    // Clear focus and selection
    plugin.managers.structure.focus.clear()
    plugin.managers.interactivity.lociSelects.deselectAll()
  }, [])

  const resetView = useCallback(() => {
    const plugin = pluginRef.current
    if (!plugin) return
    plugin.managers.camera.reset()
  }, [])

  const dispose = useCallback(() => {
    if (pluginRef.current) {
      pluginRef.current.dispose()
      pluginRef.current = undefined
    }
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
  min-height: 500px;
`

const ViewerContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;

  /* Mol* plugin container needs these styles */
  & > div {
    position: absolute !important;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
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
  z-index: 10;
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
  z-index: 10;
`
