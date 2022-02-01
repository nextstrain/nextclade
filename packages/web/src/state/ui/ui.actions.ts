import { actionCreatorFactory } from 'src/state/util/fsaActions'

const action = actionCreatorFactory('Ui')

export const setIsSettingsDialogOpen = action<boolean>('setIsSettingsDialogOpen')

export const setFilterPanelCollapsed = action<boolean>('setFilterPanelCollapsed')

export const setTreeFilterPanelCollapsed = action<boolean>('setTreeFilterPanelCollapsed')

export const setShowWhatsnew = action<boolean>('setShowWhatsnew')

export const setShowNewRunPopup = action<boolean>('setShowNewRunPopup')

export const setViewedGene = action<string>('setViewedGene')

export const resetViewedGene = action('resetViewedGene')

export const setSequenceViewZoom = action<number>('setSequenceViewZoom')

export const setSequenceViewPan = action<number>('setSequenceViewPan')
