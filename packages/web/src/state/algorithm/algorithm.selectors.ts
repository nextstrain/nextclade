import type { State } from 'src/state/reducer'

export const selectParams = (state: State) => state.algorithm.params
