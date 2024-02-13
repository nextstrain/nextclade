declare module 'auspice/src/components/controls/controls' {
  import { FC } from 'react'

  export interface AuspiceControlsProps {
    mapOn: boolean
    frequenciesOn: boolean
  }

  const AuspiceControls: FC<AuspiceControlsProps>
  export default AuspiceControls
}
