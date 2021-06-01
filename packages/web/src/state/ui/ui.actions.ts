import { actionCreatorFactory } from 'src/state/util/fsaActions'

const action = actionCreatorFactory('Ui')

export const setFilterPanelCollapsed = action<boolean>('setFilterPanelCollapsed')

export const setTreeFilterPanelCollapsed = action<boolean>('setTreeFilterPanelCollapsed')

export const setShowWhatsnew = action<boolean>('setShowWhatsnew')

export const setShowNewRunPopup = action<boolean>('setShowNewRunPopup')
