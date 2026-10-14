declare module 'auspice/src/actions/notifications' {
  import type { ThunkAction } from 'redux-thunk'
  import type { AnyAction } from 'redux'
  import type { AuspiceState } from 'auspice'

  export interface NotificationParams {
    message?: string
    details?: string
    autoClose?: boolean
  }

  type NotificationThunk = ThunkAction<void, AuspiceState, unknown, AnyAction>

  export function infoNotification(params?: NotificationParams): NotificationThunk
  export function errorNotification(params?: NotificationParams): NotificationThunk
  export function successNotification(params?: NotificationParams): NotificationThunk
  export function warningNotification(params?: NotificationParams): NotificationThunk
}

declare module 'auspice/src/actions/types' {
  export const REMOVE_NOTIFICATION: string
  export const BROWSER_DIMENSIONS: string
}
