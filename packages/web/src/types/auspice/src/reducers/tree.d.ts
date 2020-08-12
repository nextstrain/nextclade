declare module 'auspice/src/reducers/tree' {
  import { AuspiceTreeState } from 'auspice'

  declare function tree(state?: TreeState): AuspiceTreeState | undefined
  export default tree
}
