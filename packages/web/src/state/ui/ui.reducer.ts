import { reducerWithInitialState } from 'typescript-fsa-reducers'

import { uiDefaultState } from 'src/state/ui/ui.state'

import immerCase from '../util/fsaImmerReducer'

import { setExportFormat, setShowInputBox, setFilterPanelCollapsed, setTreeFilterPanelCollapsed } from './ui.actions'

export const uiReducer = reducerWithInitialState(uiDefaultState)
  .withHandling(
    immerCase(setShowInputBox, (draft, showInputBox) => {
      draft.showInputBox = showInputBox
    }),
  )

  .withHandling(
    immerCase(setExportFormat, (draft, exportFormat) => {
      draft.exportFormat = exportFormat
    }),
  )

  .withHandling(
    immerCase(setFilterPanelCollapsed, (draft, filterPanelCollapsed) => {
      draft.filterPanelCollapsed = filterPanelCollapsed
    }),
  )

  .withHandling(
    immerCase(setTreeFilterPanelCollapsed, (draft, treeFilterPanelCollapsed) => {
      draft.treeFilterPanelCollapsed = treeFilterPanelCollapsed
    }),
  )
