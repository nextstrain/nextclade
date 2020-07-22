import type { AuspiceState } from 'src/state/auspice/auspice.state'

export const auspiceStartClean = (state: AuspiceState) => ({ type: 'CLEAN_START', ...state })
