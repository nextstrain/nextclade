import { atom } from 'recoil'
import { persistAtom } from 'src/state/persist/localStorage'
import { DEFAULT_PDB_ID } from 'src/components/Structure/structureConfig'

export type ViewerLibrary = 'ngl' | 'molstar'
export type RepresentationType = 'cartoon' | 'surface' | 'ball+stick' | 'spacefill' | 'licorice'
export type EntityType = 'polymer' | 'ligand' | 'water' | 'ion' | 'carbohydrate'

export interface EntityVisibility {
  polymer: boolean
  ligand: boolean
  water: boolean
  ion: boolean
  carbohydrate: boolean
}

export const DEFAULT_ENTITY_VISIBILITY: EntityVisibility = {
  polymer: true,
  ligand: true,
  water: false,
  ion: true,
  carbohydrate: true,
}

export const selectedSequenceIndexAtom = atom<number>({
  key: 'selectedSequenceIndex',
  default: 0,
})

export const selectedPdbIdAtom = atom<string>({
  key: 'selectedPdbId',
  default: DEFAULT_PDB_ID,
  effects: [persistAtom],
})

export const viewerLibraryAtom = atom<ViewerLibrary>({
  key: 'viewerLibrary',
  default: 'ngl',
  effects: [persistAtom],
})

export const representationTypeAtom = atom<RepresentationType>({
  key: 'representationType',
  default: 'cartoon',
  effects: [persistAtom],
})

export const entityVisibilityAtom = atom<EntityVisibility>({
  key: 'entityVisibility',
  default: DEFAULT_ENTITY_VISIBILITY,
  effects: [persistAtom],
})
