declare module 'auspice/src/reducers/controls' {
  import { AuspiceControlsState } from 'auspice'

  declare function controls(state?: AuspiceControlsState): AuspiceControlsState | undefined
  export default controls
}
