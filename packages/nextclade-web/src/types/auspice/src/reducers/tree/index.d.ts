declare module 'auspice/src/reducers/tree' {
  import { AuspiceTreeState } from 'auspice'

  declare function tree(state?: AuspiceTreeState): AuspiceTreeState | undefined
  export default tree
}
