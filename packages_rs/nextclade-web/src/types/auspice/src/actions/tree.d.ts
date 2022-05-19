declare module 'auspice/src/actions/tree' {
  import { Action } from 'redux'

  export function applyFilter(mode: string, trait: string, values: string[]): Action
}
