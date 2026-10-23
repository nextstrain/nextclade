declare module 'auspice/src/actions/treeStreams' {
  import type { ThunkAction } from 'redux-thunk'
  import type { AnyAction } from 'redux'
  import type { AuspiceState } from 'auspice'

  /** Turn stream trees on or off */
  export function toggleStreamTree(): ThunkAction<void, AuspiceState, unknown, AnyAction>
}
