declare module 'auspice/src/components/controls/annotatedTitle' {
  import type { FC, ReactElement, ReactNode } from 'react'

  export interface AnnotatedTitleProps {
    title: ReactNode
    tooltip: ReactElement
  }

  export const AnnotatedTitle: FC<AnnotatedTitleProps>
}
