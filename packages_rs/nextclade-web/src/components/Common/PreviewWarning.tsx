import React, { useMemo } from 'react'
import { Alert } from 'reactstrap'
import { atom } from 'recoil'
import { useRecoilToggle } from 'src/hooks/useToggle'
import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { RELEASE_URL } from 'src/constants'
import { LinkExternal } from 'src/components/Link/LinkExternal'

const previewWarningDismissedAtom = atom({
  key: 'previewWarningDismissedAtom',
  default: false,
})

export function shouldRenderPreviewWarning(): boolean {
  return process.env.NODE_ENV !== 'development' && (process.env.BRANCH_NAME ?? '') !== 'release'
}

export function PreviewWarning() {
  const { t } = useTranslation()
  const { state: dismissed, enable: setDismissed } = useRecoilToggle(previewWarningDismissedAtom)

  const warningText = useMemo(() => t('This is a preview version. For official website please visit '), [t])

  if (!shouldRenderPreviewWarning() || dismissed) {
    return null
  }

  return (
    <Warning color="warning" fade={false} isOpen toggle={setDismissed}>
      <span>{warningText}</span>
      <span>
        <LinkExternal href={RELEASE_URL}>{RELEASE_URL}</LinkExternal>
      </span>
    </Warning>
  )
}

const Warning = styled(Alert)`
  font-size: 0.9rem;
  text-align: center;
  margin: 0;
  padding: 5px 3px;
  border-radius: 0;
  z-index: 1010;
`
