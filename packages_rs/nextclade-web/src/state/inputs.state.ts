import { isNil } from 'lodash'
import { atom, selector } from 'recoil'

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'

export const qrySeqAtom = atom<AlgorithmInput | undefined>({
  key: 'qrySeqInput',
  default: undefined,
})

export const refSeqAtom = atom<AlgorithmInput | undefined>({
  key: 'refSeqInput',
  default: undefined,
})

export const geneMapAtom = atom<AlgorithmInput | undefined>({
  key: 'geneMapInput',
  default: undefined,
})

export const refTreeAtom = atom<AlgorithmInput | undefined>({
  key: 'refTreeInput',
  default: undefined,
})

export const qcConfigAtom = atom<AlgorithmInput | undefined>({
  key: 'qcConfigInput',
  default: undefined,
})

export const virusPropertiesAtom = atom<AlgorithmInput | undefined>({
  key: 'virusPropertiesInput',
  default: undefined,
})

export const primersCsvAtom = atom<AlgorithmInput | undefined>({
  key: 'primersCsvInput',
  default: undefined,
})

export const hasRequiredInputsAtom = selector({
  key: 'hasRequiredInputs',
  get({ get }) {
    return !isNil(get(qrySeqAtom))
  },
})
