import actionCreatorFactory from 'typescript-fsa'

const action = actionCreatorFactory('UI')

export const setShowInputBox = action<boolean>('SET_SHOW_INPUT_BOX')
