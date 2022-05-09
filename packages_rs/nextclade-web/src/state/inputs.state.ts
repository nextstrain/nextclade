import { isNil } from 'lodash'
import { atom, selector } from 'recoil'

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'

export const qrySeqAtom = atom<AlgorithmInput | undefined>({
  key: 'qrySeq',
  default: undefined,
})

export const refSeqAtom = atom<AlgorithmInput | undefined>({
  key: 'refSeq',
  default: undefined,
})

export const geneMapAtom = atom<AlgorithmInput | undefined>({
  key: 'geneMap',
  default: undefined,
})

export const refTreeAtom = atom<AlgorithmInput | undefined>({
  key: 'refTree',
  default: undefined,
})

export const qcConfigAtom = atom<AlgorithmInput | undefined>({
  key: 'qcConfig',
  default: undefined,
})

export const virusPropertiesAtom = atom<AlgorithmInput | undefined>({
  key: 'virusProperties',
  default: undefined,
})

export const primersCsvAtom = atom<AlgorithmInput | undefined>({
  key: 'primersCsv',
  default: undefined,
})

export const hasRequiredInputsAtom = selector({
  key: 'hasRequiredInputs',
  get({ get }) {
    return !isNil(get(qrySeqAtom))
  },
})
