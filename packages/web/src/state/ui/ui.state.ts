export interface UiState {
  filterPanelCollapsed: boolean
  treeFilterPanelCollapsed: boolean
  showWhatsnew: boolean
  showNewRunPopup: boolean
}

export const uiDefaultState: UiState = {
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  showWhatsnew: false,
  showNewRunPopup: false,
}
