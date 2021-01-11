export enum ExportFormat {
  CSV = 'CSV',
  TSV = 'TSV',
  JSON = 'JSON',
  TREE_JSON = 'Auspice',
}

export interface UiState {
  sequenceView: {
    zoom: number
    pan: number
  }
  filterPanelCollapsed: boolean
  treeFilterPanelCollapsed: boolean
  exportFormat: ExportFormat
  showWhatsnew: boolean
  showNewRunPopup: boolean
}

export const uiDefaultState: UiState = {
  sequenceView: {
    zoom: 1,
    pan: 0,
  },
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  exportFormat: ExportFormat.CSV,
  showWhatsnew: false,
  showNewRunPopup: false,
}
