import React, { useMemo } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { UncontrolledAlert } from 'reactstrap'

import { RELEASE_URL } from 'src/constants'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function shouldRenderPreviewWarning(): boolean {
  return process.env.NODE_ENV !== 'development' && (process.env.BRANCH_NAME ?? '') !== 'release'
}

export function PreviewWarning() {
  const { t } = useTranslation()

  const warningText = useMemo(() => t('This is a preview version. For official website please visit '), [t])

  if (!shouldRenderPreviewWarning()) {
    return null
  }

  return (
    <UncontrolledAlert color="warning" className="text-center m-0" fade={false}>
      <span>{warningText}</span>
      <span>
        <LinkExternal href={RELEASE_URL}>{RELEASE_URL}</LinkExternal>
      </span>
    </UncontrolledAlert>
  )
}
