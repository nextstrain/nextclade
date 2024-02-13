import copy from 'fast-copy'
import { isNil } from 'lodash'
import { atom, selector } from 'recoil'
import { plausible } from 'src/components/Common/Plausible'

export const globalErrorAtom = atom<Error | undefined>({
  key: 'globalError',
  default: undefined,
  effects: [
    ({ onSet }) => {
      onSet((error, _1, isReset) => {
        if (error && !isReset) {
          let message = copy(error.message)
          if (message.includes('Cannot read file')) {
            message = 'Cannot read file'
          }
          message = `${error.name}: ${message}`
          plausible('Global error v2', { props: { message } })
          console.error(error)
        }
      })
    },
  ],
})

export const qrySeqErrorAtom = atom<string | undefined>({
  key: 'qrySeqError',
  default: undefined,
})

export const refSeqErrorAtom = atom<string | undefined>({
  key: 'refSeqError',
  default: undefined,
})

export const geneMapErrorAtom = atom<string | undefined>({
  key: 'geneMapError',
  default: undefined,
})

export const refTreeErrorAtom = atom<string | undefined>({
  key: 'refTreeError',
  default: undefined,
})

export const qcConfigErrorAtom = atom<string | undefined>({
  key: 'qcConfigError',
  default: undefined,
})

export const virusPropertiesErrorAtom = atom<string | undefined>({
  key: 'virusPropertiesError',
  default: undefined,
})

export const primersCsvErrorAtom = atom<string | undefined>({
  key: 'primersCsvError',
  default: undefined,
})

export const hasInputErrorsAtom = selector({
  key: 'hasInputErrors',
  get({ get }) {
    return [
      get(qrySeqErrorAtom),
      get(refSeqErrorAtom),
      get(geneMapErrorAtom),
      get(refTreeErrorAtom),
      get(qcConfigErrorAtom),
      get(virusPropertiesErrorAtom),
      get(primersCsvErrorAtom),
    ].some((error) => !isNil(error))
  },
})
