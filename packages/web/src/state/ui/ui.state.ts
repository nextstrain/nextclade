export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
}

export interface UiState {
  filterPanelCollapsed: boolean
  exportFormat: ExportFormat
  showInputBox: boolean
}

export const uiDefaultState: UiState = {
  filterPanelCollapsed: true,
  showInputBox: false,
  exportFormat: ExportFormat.CSV,
}
