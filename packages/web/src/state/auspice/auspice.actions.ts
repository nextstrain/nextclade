import actionCreatorFactory from 'typescript-fsa'

import type { AuspiceState } from 'src/state/auspice/auspice.state'

// This action is not FSA-compliant. This is the format Auspice expects
export const auspiceStartClean = (state: AuspiceState) => ({ type: 'CLEAN_START', ...state })

const action = actionCreatorFactory('Auspice')

export const showTree = action('showTree')
