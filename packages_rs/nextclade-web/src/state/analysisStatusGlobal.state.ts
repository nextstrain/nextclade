import { atom, selector } from 'recoil'
import { AlgorithmGlobalStatus } from "src/algorithms/types";

export const analysisStatusGlobalAtom = atom({
  key: 'analysisStatusGlobal',
  default: AlgorithmGlobalStatus.idle,
})

export const canRunAtom = selector({
  key: 'canRun',
  get({ get }) {
    const status = get(analysisStatusGlobalAtom)
    return (
      status === AlgorithmGlobalStatus.idle ||
      status === AlgorithmGlobalStatus.done ||
      status === AlgorithmGlobalStatus.failed
    )
  },
})

export const hasRanAtom = selector({
  key: 'hasRan',
  get({ get }) {
    const status = get(analysisStatusGlobalAtom)
    return status !== AlgorithmGlobalStatus.idle
  },
})
