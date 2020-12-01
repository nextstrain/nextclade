import { actionCreatorFactory } from 'src/state/util/fsaActions'

import { ExportFormat } from 'src/state/ui/ui.state'

const action = actionCreatorFactory('Ui')

export const setExportFormat = action<ExportFormat>('setExportFormat')

export const setFilterPanelCollapsed = action<boolean>('setFilterPanelCollapsed')

export const setTreeFilterPanelCollapsed = action<boolean>('setTreeFilterPanelCollapsed')

export const setShowWhatsnew = action<boolean>('setShowWhatsnew')

export const setShowNewRunPopup = action<boolean>('setShowNewRunPopup')
