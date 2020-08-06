declare module 'auspice/src/reducers/notifications' {
  export declare type NotificationsState = Record<string, unknown>
  declare function notifications(State?: NotificationsState): NotificationsState | undefined
  export default notifications
}
