import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'

export interface UiState {
  isSettingsDialogOpen: boolean
  sequenceView: {
    zoom: number
    pan: number
  }
  filterPanelCollapsed: boolean
  treeFilterPanelCollapsed: boolean
  showWhatsnew: boolean
  showNewRunPopup: boolean
  viewedGene: string
}

export const uiDefaultState: UiState = {
  isSettingsDialogOpen: false,
  sequenceView: {
    zoom: 1,
    pan: 0,
  },
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  showWhatsnew: false,
  showNewRunPopup: false,
  viewedGene: GENE_OPTION_NUC_SEQUENCE,
}
