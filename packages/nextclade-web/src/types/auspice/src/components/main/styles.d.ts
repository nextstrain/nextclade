declare module 'auspice/src/components/main/styles' {
  import type { FC } from 'react'

  export const SidebarContainer: FC

  export const sidebarTheme: {
    'background': string
    'color': string
    'font-family': string
    'sidebarBoxShadow': string
    'selectedColor': string
    'unselectedColor': string
    'unselectedBackground': string
  }
}
