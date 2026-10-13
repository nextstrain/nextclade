declare module 'auspice/src/components/controls/panelSection' {
  import type { FC, ReactElement } from 'react'

  export interface PanelSectionProps {
    /** Panel identifier, as in `controls.panelsToDisplay` */
    panel: string
    title: string
    tooltip?: ReactElement
    /** Panel-specific options, shown below the header while the panel is visible */
    options?: ReactElement
  }

  export const PanelSection: FC<PanelSectionProps>
}
