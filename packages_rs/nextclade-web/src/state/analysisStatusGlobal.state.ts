import { atom } from 'recoil'

import { AlgorithmGlobalStatus } from 'src/state/algorithm/algorithm.state'

export const analysisStatusGlobalAtom = atom({
  key: 'analysisStatusGlobal',
  default: AlgorithmGlobalStatus.idle,
})
