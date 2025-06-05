import { atom, selectorFamily } from 'recoil'
import { CDS_OPTION_NUC_SEQUENCE } from 'src/constants'
import { ErrorInternal } from 'src/helpers/ErrorInternal'

import { persistAtom } from 'src/state/persist/localStorage'
import { multiAtom } from 'src/state/utils/multiAtom'

export enum SeqMarkerHeightState {
  Off = 'Off',
  Top = 'Top',
  Bottom = 'Bottom',
  Full = 'Full',
}

export const SEQ_MARKER_HEIGHT_STATES = Object.keys(SeqMarkerHeightState)

export function seqMarkerHeightStateToString(val: SeqMarkerHeightState) {
  return val.toString()
}

export function seqMarkerHeightStateFromString(key: string) {
  // prettier-ignore
  switch (key) {
    case 'Top':
      return SeqMarkerHeightState.Top
    case 'Bottom':
      return SeqMarkerHeightState.Bottom
    case 'Full':
      return SeqMarkerHeightState.Full
    case 'Off':
      return SeqMarkerHeightState.Off
  }
  throw new ErrorInternal(`When converting string to 'SeqMarkerHeightState': Unknown variant'${key}'`)
}

export function getSeqMarkerDims(state: SeqMarkerHeightState) {
  switch (state) {
    case SeqMarkerHeightState.Top:
      return { y: -10, height: 10 }
    case SeqMarkerHeightState.Bottom:
      return { y: 10, height: 10 }
    case SeqMarkerHeightState.Full:
      return { y: -10, height: 30 }
    case SeqMarkerHeightState.Off:
      return { y: 0, height: 0 }
  }
  throw new ErrorInternal(`getSeqMarkerDims: Unknown 'SeqMarkerHeightState' variant: '${state}'`)
}

export const seqMarkerMissingHeightStateAtom = atom<SeqMarkerHeightState>({
  key: 'seqMarkerMissingHeight',
  default: SeqMarkerHeightState.Top,
  effects: [persistAtom],
})

export const seqMarkerAmbiguousHeightStateAtom = atom<SeqMarkerHeightState>({
  key: 'seqMarkerAmbiguousHeightStateAtom',
  default: SeqMarkerHeightState.Top,
  effects: [persistAtom],
})

export const seqMarkerGapHeightStateAtom = atom<SeqMarkerHeightState>({
  key: 'seqMarkerGapHeight',
  default: SeqMarkerHeightState.Full,
  effects: [persistAtom],
})

export const seqMarkerMutationHeightStateAtom = atom<SeqMarkerHeightState>({
  key: 'seqMarkerMutationHeight',
  default: SeqMarkerHeightState.Full,
  effects: [persistAtom],
})

export const seqMarkerUnsequencedHeightStateAtom = atom<SeqMarkerHeightState>({
  key: 'seqMarkerUnsequencedHeight',
  default: SeqMarkerHeightState.Full,
  effects: [persistAtom],
})

export enum SeqMarkerState {
  Off = 'Off',
  On = 'On',
}

export const SEQ_MARKER_STATES = Object.keys(SeqMarkerState)

export function seqMarkerStateToString(val: SeqMarkerState) {
  return val.toString()
}

export function seqMarkerStateFromString(key: string) {
  // prettier-ignore
  switch (key) {
    case 'On':
      return SeqMarkerState.On
    case 'Off':
      return SeqMarkerState.Off
  }
  throw new ErrorInternal(`When converting string to 'SeqMarkerState': Unknown variant'${key}'`)
}

export const seqMarkerInsertionStateAtom = atom<SeqMarkerState>({
  key: 'seqMarkerInsertionStateAtom',
  default: SeqMarkerState.On,
  effects: [persistAtom],
})

export const seqMarkerFrameShiftStateAtom = atom<SeqMarkerState>({
  key: 'seqMarkerFrameShiftState',
  default: SeqMarkerState.On,
  effects: [persistAtom],
})

export const maxNucMarkersAtom = atom<number>({
  key: 'maxNucMarkers',
  default: 500,
  effects: [persistAtom],
})

export const [viewedCdsAtom, allViewedCdsAtom] = multiAtom<string, { datasetName: string }>({
  key: 'viewedCdsAtom',
})

export const isInNucleotideViewAtom = selectorFamily<boolean, { datasetName: string }>({
  key: 'isInNucleotideView',
  get:
    ({ datasetName }) =>
    ({ get }) =>
      get(viewedCdsAtom({ datasetName })) === CDS_OPTION_NUC_SEQUENCE,
})

export const switchToNucleotideViewAtom = selectorFamily<unknown, { datasetName: string }>({
  key: 'switchToNucleotideView',
  get: () => () => undefined,
  set:
    ({ datasetName }) =>
    ({ set }) =>
      set(viewedCdsAtom({ datasetName }), CDS_OPTION_NUC_SEQUENCE),
})
