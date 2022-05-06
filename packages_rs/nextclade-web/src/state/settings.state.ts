import { atom } from 'recoil'

import { getNumThreads } from 'src/helpers/getNumThreads'

export const numThreadsAtom = atom({
  key: 'numThreads',
  default: getNumThreads(),
})
