import actionCreatorFactory from 'typescript-fsa'
import { ExportFormat } from 'src/state/ui/ui.state'

const action = actionCreatorFactory('UI')

export const setShowInputBox = action<boolean>('SET_SHOW_INPUT_BOX')

export const setExportFormat = action<ExportFormat>('SET_EXPORT_FORMAT')

export const setFilterPanelCollapsed = action<boolean>('setFilterPanelCollapsed')
