import { atom } from 'recoil'

export const seqNamesFilterAtom = atom<string>({
  key: 'seqNamesFilter',
  default: '',
})

export const mutationsFilterAtom = atom<string>({
  key: 'mutationsFilter',
  default: '',
})

export const cladesFilterAtom = atom<string>({
  key: 'cladesFilter',
  default: '',
})

export const aaFilterAtom = atom<string>({
  key: 'aaFilter',
  default: '',
})

export const showGoodFilterAtom = atom<boolean>({
  key: 'showGoodFilter',
  default: true,
})

export const showMediocreFilterAtom = atom<boolean>({
  key: 'showMediocreFilter',
  default: true,
})

export const showBadFilterAtom = atom<boolean>({
  key: 'showBadFilter',
  default: true,
})

export const showErrorsFilterAtom = atom<boolean>({
  key: 'showErrorsFilter',
  default: true,
})
