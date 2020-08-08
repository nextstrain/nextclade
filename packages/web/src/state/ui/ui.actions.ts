import actionCreatorFactory from 'typescript-fsa'
import { ExportFormat } from 'src/state/ui/ui.state'

const action = actionCreatorFactory('Ui')

export const setShowInputBox = action<boolean>('setShowInputBox')

export const setExportFormat = action<ExportFormat>('setExportFormat')

export const setDetailsPanelCollapsed = action<boolean>('setDetailsPanelCollapsed')

export const setFilterPanelCollapsed = action<boolean>('setFilterPanelCollapsed')

export const setTreeFilterPanelCollapsed = action<boolean>('setTreeFilterPanelCollapsed')
