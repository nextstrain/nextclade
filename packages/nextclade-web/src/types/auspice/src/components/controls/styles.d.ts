declare module 'auspice/src/components/controls/styles' {
  import { PropsWithChildren, FC } from 'react'

  export const HeaderContainer: FC<PropsWithChildren>

  export const ControlsContainer: FC<PropsWithChildren>

  export const TitleAndIconContainer: FC<PropsWithChildren>

  /** Title of a control in a sidebar section */
  export const SidebarSubtitle: FC<PropsWithChildren>
}
