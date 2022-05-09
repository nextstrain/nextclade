import { atom } from 'recoil'

import { getNumThreads } from 'src/helpers/getNumThreads'

export const numThreadsAtom = atom({
  key: 'numThreads',
  default: getNumThreads(),
})

export const shouldRunAutomaticallyAtom = atom({
  key: 'shouldRunAutomatically',
  default: false,
})

export const showNewRunPopupAtom = atom({
  key: 'showNewRunPopup',
  default: false,
})
