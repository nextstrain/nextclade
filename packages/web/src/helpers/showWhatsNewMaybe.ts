import { Dispatch } from 'redux'
import compareVersions from 'compare-versions'

import { setShowWhatsnew } from 'src/state/ui/ui.actions'
import { setLastVersionSeen } from 'src/state/settings/settings.actions'

const BRANCH_NAME = process.env.BRANCH_NAME ?? ''
const PACKAGE_VERSION = process.env.PACKAGE_VERSION ?? ''

export function checkIsNewerVersionSafe(currentVersion: string, lastVersionSeen: string) {
  if (lastVersionSeen === '') {
    return true
  }

  try {
    return compareVersions.compare(currentVersion, lastVersionSeen, '>')
  } catch {} // eslint-disable-line no-empty

  return true
}

export function showWhatsNewMaybe(lastVersionSeen: string, showWhatsnewOnUpdate: boolean, dispatch: Dispatch) {
  if (!showWhatsnewOnUpdate) {
    return
  }

  const isPr = !['master', 'staging', 'release'].includes(BRANCH_NAME)
  if (isPr) {
    return
  }

  const isNewerVersion = checkIsNewerVersionSafe(PACKAGE_VERSION, lastVersionSeen)
  if (isNewerVersion) {
    dispatch(setShowWhatsnew(isNewerVersion))
  }

  dispatch(setLastVersionSeen(PACKAGE_VERSION))
}
