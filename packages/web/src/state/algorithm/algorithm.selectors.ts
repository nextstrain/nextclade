import type { State } from 'src/state/reducer'

export const selectParams = (state: State) => state.algorithm.params

export const selectResults = (state: State) => state.algorithm.results

export const selectIsDirty = (state: State): boolean => state.algorithm.isDirty
