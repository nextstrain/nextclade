declare module 'auspice/src/components/framework/svg-icons' {
  import { FC } from 'react'

  export interface IconTheme {
    unselectedColor: string
    selectedColor?: string
  }

  export interface RectangularTreeProps {
    theme: IconTheme
    width: number
    selected?: boolean
  }

  export const RectangularTree: FC<RectangularTreeProps>
}
