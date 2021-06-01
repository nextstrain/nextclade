import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import { uiDefaultState } from 'src/state/ui/ui.state'
import {
  setFilterPanelCollapsed,
  setShowNewRunPopup,
  setShowWhatsnew,
  setTreeFilterPanelCollapsed,
} from 'src/state/ui/ui.actions'

export const uiReducer = reducerWithInitialState(uiDefaultState)
  .icase(setFilterPanelCollapsed, (draft, filterPanelCollapsed) => {
    draft.filterPanelCollapsed = filterPanelCollapsed
  })

  .icase(setTreeFilterPanelCollapsed, (draft, treeFilterPanelCollapsed) => {
    draft.treeFilterPanelCollapsed = treeFilterPanelCollapsed
  })

  .icase(setShowWhatsnew, (draft, showWhatsnew) => {
    draft.showWhatsnew = showWhatsnew
  })

  .icase(setShowNewRunPopup, (draft, showNewRunPopup) => {
    draft.showNewRunPopup = showNewRunPopup
  })
