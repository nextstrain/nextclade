export enum ExportFormat {
  CSV = 'CSV',
  TSV = 'TSV',
  JSON = 'JSON',
  TREE_JSON = 'Auspice',
}

export interface UiState {
  filterPanelCollapsed: boolean
  treeFilterPanelCollapsed: boolean
  exportFormat: ExportFormat
  showWhatsnew: boolean
  showNewRunPopup: boolean
}

export const uiDefaultState: UiState = {
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  exportFormat: ExportFormat.CSV,
  showWhatsnew: false,
  showNewRunPopup: false,
}
