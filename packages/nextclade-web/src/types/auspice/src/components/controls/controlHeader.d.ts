declare module 'auspice/src/components/controls/controlHeader' {
  import type { FC, ReactElement, ReactNode } from 'react'

  export interface ControlHeaderProps {
    title: ReactNode
    tooltip: ReactElement
  }

  export const ControlHeader: FC<ControlHeaderProps>
}
