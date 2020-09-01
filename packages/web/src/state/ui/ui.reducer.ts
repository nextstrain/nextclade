import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import { uiDefaultState } from 'src/state/ui/ui.state'
import {
  setExportFormat,
  setShowInputBox,
  setFilterPanelCollapsed,
  setTreeFilterPanelCollapsed,
} from 'src/state/ui/ui.actions'

export const uiReducer = reducerWithInitialState(uiDefaultState)
  .icase(setShowInputBox, (draft, showInputBox) => {
    draft.showInputBox = showInputBox
  })

  .icase(setExportFormat, (draft, exportFormat) => {
    draft.exportFormat = exportFormat
  })

  .icase(setFilterPanelCollapsed, (draft, filterPanelCollapsed) => {
    draft.filterPanelCollapsed = filterPanelCollapsed
  })

  .icase(setTreeFilterPanelCollapsed, (draft, treeFilterPanelCollapsed) => {
    draft.treeFilterPanelCollapsed = treeFilterPanelCollapsed
  })
