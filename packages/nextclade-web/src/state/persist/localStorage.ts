import { recoilPersist } from 'recoil-persist'
import { PROJECT_NAME } from 'src/constants'

export const { persistAtom } = recoilPersist({
  key: `${PROJECT_NAME}-storage-v6`, // increment this version on breaking changes
})
