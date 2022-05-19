import compareVersions from 'compare-versions'

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

export function shouldShowChangelog(lastVersionSeen: string, showWhatsnewOnUpdate: boolean) {
  if (!showWhatsnewOnUpdate) {
    return false
  }

  const isPr = !['master', 'staging', 'release'].includes(BRANCH_NAME)
  if (isPr) {
    return false
  }

  return checkIsNewerVersionSafe(PACKAGE_VERSION, lastVersionSeen)
}
