declare module 'auspice/src/components/tree' {
  import { FC } from 'react'

  export interface AuspiceTreeProps {
    width: number
    height: number
  }

  const AuspiceTree: FC<AuspiceTreeProps>
  export default AuspiceTree
}
