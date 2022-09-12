import React, { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { isNil } from 'lodash'
import Bowser from 'bowser'
import { useTranslation } from 'react-i18next'
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap'

import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { ModalHeader } from 'src/components/Error/ErrorPopup'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function BrowserWarningAsync() {
  const { t } = useTranslation()

  const [isOpen, setIsOpen] = useState(true)
  const dismiss = useCallback(() => setIsOpen(false), [setIsOpen])

  const nameAndVersion = useMemo(() => {
    if (typeof window === 'undefined' || isNil(window?.navigator?.userAgent)) {
      return null
    }

    const browser = Bowser.getParser(window?.navigator?.userAgent)
    const isSupportedBrowser = browser.satisfies({
      chrome: '>60',
      edge: '>79',
      firefox: '>52',
    })

    if (isSupportedBrowser) {
      return null
    }

    const { name, version } = browser.getBrowser()
    return [name, version].filter(notUndefinedOrNull).join(' ')
  }, [])

  if (!nameAndVersion) {
    return null
  }

  return (
    <Modal centered isOpen={isOpen} backdrop="static" toggle={dismiss} fade={false} size="lg">
      <ModalHeader toggle={dismiss} tag="div">
        <h4 className="text-center text-danger">{t('Unsupported browser')}</h4>
      </ModalHeader>

      <ModalBody>
        <p>{t('This browser version ({{nameAndVersion}}) is not supported.', { nameAndVersion })}</p>
        <p>
          {t('Nextclade works best in the latest version of ')}
          <LinkExternal href="https://www.google.com/chrome/">{t('Chrome')}</LinkExternal>
          <span>{t(' or ')}</span>
          <LinkExternal href="https://www.mozilla.org/firefox/browsers/">{t('Firefox')}</LinkExternal>
          <span>{t('.')}</span>
        </p>
      </ModalBody>

      <ModalFooter>
        <div className="mx-auto">
          <Button type="button" color="danger" title={t('Close this dialog window')} onClick={dismiss}>
            {t('I want to try anyway')}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}

export const BrowserWarning = dynamic(() => Promise.resolve(BrowserWarningAsync), { ssr: false })
