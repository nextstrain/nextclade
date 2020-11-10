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
  showInputBox: boolean
  showWhatsnew: boolean
}

export const uiDefaultState: UiState = {
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  showInputBox: false,
  exportFormat: ExportFormat.CSV,
  showWhatsnew: false,
}
