import { atom, selector } from 'recoil'

import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'

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
