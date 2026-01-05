import type { RepresentationType } from 'src/state/structure.state'

export interface ResidueSelection {
  chain: string
  position: number
  color?: string
}

export interface StructureViewerHandle {
  load(data: ArrayBuffer, format: string): Promise<void>
  setRepresentation(type: RepresentationType): void
  highlightResidues(selections: ResidueSelection[]): void
  clearHighlights(): void
  resetView(): void
  dispose(): void
}
