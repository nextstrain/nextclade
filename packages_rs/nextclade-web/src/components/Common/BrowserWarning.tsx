import Bowser from 'bowser'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap'
import { ModalHeader } from 'src/components/Error/ErrorPopup'
import { LinkExternal } from 'src/components/Link/LinkExternal'

import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export function BrowserWarning() {
  const { t } = useTranslation()

  const [isOpen, setIsOpen] = useState(true)
  const dismiss = useCallback(() => setIsOpen(false), [setIsOpen])

  const nameAndVersion = useMemo(() => {
    const browser = Bowser.getParser(window?.navigator?.userAgent)
    const isSupportedBrowser = browser.satisfies({
      chrome: '>60',
      edge: '>79',
      firefox: '>52',
      safari: '>=16',
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
