declare module 'auspice/src/reducers/entropy' {
  import { AuspiceEntropyState } from 'auspice'

  declare function entropy(state?: AuspiceEntropyState): AuspiceEntropyState | undefined
  export default entropy
}
