export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
  AuspiceJSONv2 = 'AuspiceJSONv2',
}

export interface UiState {
  detailsPanelCollapsed: boolean
  filterPanelCollapsed: boolean
  treeFilterPanelCollapsed: boolean
  exportFormat: ExportFormat
  showInputBox: boolean
}

export const uiDefaultState: UiState = {
  detailsPanelCollapsed: true,
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  showInputBox: false,
  exportFormat: ExportFormat.CSV,
}
