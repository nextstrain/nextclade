declare module 'auspice/src/reducers/measurements' {
  import { AuspiceMeasurementsState } from 'auspice'

  declare function measurements(state?: AuspiceMeasurementsState): AuspiceMeasurementsState | undefined
  export default measurements
}
