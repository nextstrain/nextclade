declare module 'auspice/src/components/main/utils' {
  export interface PanelDims {
    width: number
    height: number
  }

  /** Return the sizes of Auspice's panels in the available area: in the full layout, in the grid, and of the charts */
  export function calcPanelDims(
    panels: string[],
    narrativeIsDisplayed: boolean,
    availableWidth: number,
    availableHeight: number,
  ): { full: PanelDims; grid: PanelDims; chartFrequencies: PanelDims; chartEntropy: PanelDims }
}
