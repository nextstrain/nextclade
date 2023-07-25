import { isEmpty } from 'lodash'
import { useCallback } from 'react'
import { atom, selector, useRecoilState, useResetRecoilState } from 'recoil'
import { AlgorithmInput } from 'src/types'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export const qrySeqInputsStorageAtom = atom<AlgorithmInput[]>({
  key: 'qrySeqInputsStorage',
  default: [],
})

export function useQuerySeqInputs() {
  const [qryInputs, setQryInputs] = useRecoilState(qrySeqInputsStorageAtom)
  const clearQryInputs = useResetRecoilState(qrySeqInputsStorageAtom)

  const addQryInputs = useCallback(
    (newInputs: AlgorithmInput[]) => {
      setQryInputs((inputs) => [...inputs, ...newInputs])
    },
    [setQryInputs],
  )

  const removeQryInput = useCallback(
    (index: number) => {
      setQryInputs((inputs) => inputs.filter((_, i) => i !== index))
    },
    [setQryInputs],
  )

  return { qryInputs, addQryInputs, removeQryInput, clearQryInputs }
}

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

export const hasRequiredInputsAtom = selector({
  key: 'hasRequiredInputs',
  get({ get }) {
    return !isEmpty(get(qrySeqInputsStorageAtom))
  },
})

/** Counts how many custom inputs are set */
export const inputCustomizationCounterAtom = selector<number>({
  key: 'inputCustomizationCounterAtom',
  get: ({ get }) => {
    return [
      get(refSeqInputAtom),
      get(geneMapInputAtom),
      get(refTreeInputAtom),
      get(qcConfigInputAtom),
      get(virusPropertiesInputAtom),
    ].filter(notUndefinedOrNull).length
  },
})

/** Resets all inputs (e.g. when switching datasets) */
export const inputResetAtom = selector<undefined>({
  key: 'inputReset',
  get: () => undefined,
  set({ reset }) {
    reset(qrySeqInputsStorageAtom)
    reset(refSeqInputAtom)
    reset(geneMapInputAtom)
    reset(refTreeInputAtom)
    reset(qcConfigInputAtom)
    reset(virusPropertiesInputAtom)
  },
})
