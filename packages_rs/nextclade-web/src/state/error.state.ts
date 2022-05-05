import { atom } from 'recoil'

export const errorAtom = atom<Error | undefined>({
  key: 'error',
  default: undefined,
})
