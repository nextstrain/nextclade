import { atom } from 'recoil'
import { persistAtom } from 'src/state/persist/localStorage'

export type ViewerLibrary = 'ngl' | 'molstar'
export type RepresentationType = 'cartoon' | 'surface' | 'ball+stick' | 'spacefill' | 'licorice'

export const selectedSequenceIndexAtom = atom<number>({
  key: 'selectedSequenceIndex',
  default: 0,
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
