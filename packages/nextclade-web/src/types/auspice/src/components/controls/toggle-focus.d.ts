declare module 'auspice/src/components/controls/toggle-focus' {
  import { FC, ReactElement } from 'react'

  export interface ToggleFocusProps {
    tooltip: ReactElement
  }

  export const ToggleFocus: FC<ToggleFocusProps>
  export default ToggleFocus
}
