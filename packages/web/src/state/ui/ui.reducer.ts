import { reducerWithInitialState } from 'src/state/util/fsaReducer'

import { uiDefaultState } from 'src/state/ui/ui.state'
import {
  setIsSettingsDialogOpen,
  resetViewedGene,
  setFilterPanelCollapsed,
  setSequenceViewPan,
  setSequenceViewZoom,
  setShowNewRunPopup,
  setShowWhatsnew,
  setTreeFilterPanelCollapsed,
  setViewedGene,
} from 'src/state/ui/ui.actions'

export const uiReducer = reducerWithInitialState(uiDefaultState)
  .icase(setIsSettingsDialogOpen, (draft, isSettingsDialogOpen) => {
    draft.isSettingsDialogOpen = isSettingsDialogOpen
  })

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

  .icase(setViewedGene, (draft, viewedGene) => {
    draft.viewedGene = viewedGene
  })

  .icase(resetViewedGene, (draft) => {
    draft.viewedGene = uiDefaultState.viewedGene
  })

  .icase(setSequenceViewZoom, (draft, zoom) => {
    draft.sequenceView.zoom = zoom
  })

  .icase(setSequenceViewPan, (draft, pan) => {
    draft.sequenceView.pan = pan
  })
