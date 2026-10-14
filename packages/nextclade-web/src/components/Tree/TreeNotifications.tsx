import React, { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import styled from 'styled-components'
import type { AuspiceState } from 'auspice'
import { REMOVE_NOTIFICATION } from 'auspice/src/actions/types'
import { SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'
import { TREE_OVERLAY_Z_INDEX } from 'src/components/Tree/Tree'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

/** Alert color of each kind of Auspice notification */
const ALERT_COLORS: Record<AuspiceNotificationType, string> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
}

/**
 * Messages from Auspice about the tree: results of downloads (e.g. the file name), of added metadata and their
 * errors. Auspice removes the messages after a few seconds, except errors, which stay until closed.
 */
export function TreeNotifications() {
  const notifications = useSelector((state: AuspiceState) => state.notifications?.stack)
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return null
  }
  return (
    <NotificationList aria-live="polite">
      {notifications.filter(isAuspiceNotification).map((notification) => (
        <TreeNotification key={notification.id} notification={notification} />
      ))}
    </NotificationList>
  )
}

function TreeNotification({ notification }: { notification: AuspiceNotification }) {
  const { t } = useTranslationSafe()
  const dispatch = useDispatch()
  const { id, notificationType, message, details } = notification
  const close = useCallback(() => dispatch({ type: REMOVE_NOTIFICATION, id }), [dispatch, id])
  // Bootstrap alert markup. The `Alert` of reactstrap always has the role `alert`, which announces every message as
  // urgent. Here only errors are urgent
  return (
    <NotificationAlert
      className={`alert alert-${ALERT_COLORS[notificationType]} alert-dismissible`}
      role={notificationType === 'error' ? 'alert' : 'status'}
    >
      <NotificationMessage>{message}</NotificationMessage>
      {details && <NotificationDetails>{details}</NotificationDetails>}
      <button type="button" className="close" aria-label={t('Close')} onClick={close}>
        <span aria-hidden>{'\u00D7'}</span>
      </button>
    </NotificationAlert>
  )
}

function isAuspiceNotification(value: unknown): value is AuspiceNotification {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'notificationType' in value &&
    typeof value.notificationType === 'string' &&
    value.notificationType in ALERT_COLORS
  )
}

type AuspiceNotificationType = 'info' | 'success' | 'warning' | 'error'

/** Entry of Auspice's notification stack (`reducers/notifications.js`) */
interface AuspiceNotification {
  id: number
  notificationType: AuspiceNotificationType
  message: string
  details: string
}

/** Lower right corner of the tree page, over the tree */
const NotificationList = styled.div`
  position: absolute;
  z-index: ${TREE_OVERLAY_Z_INDEX};
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, calc(100% - 32px));
  font-family: ${SIDEBAR_THEME['font-family']};
`

const NotificationAlert = styled.div`
  margin: 0;
  padding: 8px 40px 8px 12px;
  font-size: 14px;
  box-shadow: 0 2px 8px ${SIDEBAR_THEME.sidebarBoxShadow};

  & > .close {
    padding: 8px 12px;
  }
`

const NotificationMessage = styled.p`
  margin: 0;
  font-weight: 700;
  overflow-wrap: anywhere;
`

const NotificationDetails = styled.p`
  margin: 0;
  overflow-wrap: anywhere;
`
