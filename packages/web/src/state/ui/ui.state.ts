import { GENE_OPTION_NUC_SEQUENCE } from 'src/constants'

export interface UiState {
  filterPanelCollapsed: boolean
  treeFilterPanelCollapsed: boolean
  showWhatsnew: boolean
  showNewRunPopup: boolean
  viewedGene: string
}

export const uiDefaultState: UiState = {
  filterPanelCollapsed: true,
  treeFilterPanelCollapsed: true,
  showWhatsnew: false,
  showNewRunPopup: false,
  viewedGene: GENE_OPTION_NUC_SEQUENCE,
}
