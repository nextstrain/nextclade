export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
}

export interface UiState {
  exportFormat: ExportFormat
  showInputBox: boolean
}

export const uiDefaultState: UiState = {
  showInputBox: false,
  exportFormat: ExportFormat.CSV,
}
