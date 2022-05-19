import { isNil } from 'lodash'
import { atom, selector } from 'recoil'
import { AlgorithmInput } from "src/algorithms/types";

export const qrySeqInputAtom = atom<AlgorithmInput | undefined>({
  key: 'qrySeqInput',
  default: undefined,
})

export const refSeqInputAtom = atom<AlgorithmInput | undefined>({
  key: 'refSeqInput',
  default: undefined,
})

export const geneMapInputAtom = atom<AlgorithmInput | undefined>({
  key: 'geneMapInput',
  default: undefined,
})

export const refTreeInputAtom = atom<AlgorithmInput | undefined>({
  key: 'refTreeInput',
  default: undefined,
})

export const qcConfigInputAtom = atom<AlgorithmInput | undefined>({
  key: 'qcConfigInput',
  default: undefined,
})

export const virusPropertiesInputAtom = atom<AlgorithmInput | undefined>({
  key: 'virusPropertiesInput',
  default: undefined,
})

export const primersCsvInputAtom = atom<AlgorithmInput | undefined>({
  key: 'primersCsvInput',
  default: undefined,
})

export const hasRequiredInputsAtom = selector({
  key: 'hasRequiredInputs',
  get({ get }) {
    return !isNil(get(qrySeqInputAtom))
  },
})
