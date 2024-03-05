import Bowser from 'bowser'
import React, { useMemo } from 'react'
import { atom } from 'recoil'
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap'
import { PROJECT_NAME } from 'src/constants'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { ModalHeader } from 'src/components/Error/ErrorPopup'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { notUndefinedOrNull } from 'src/helpers/notUndefined'
import { useRecoilToggle } from 'src/hooks/useToggle'

const browserWarningDismissedAtom = atom({
  key: 'browserWarningDismissedAtom',
  default: false,
})

export function BrowserWarning() {
  const { t } = useTranslation()

  const { state: dismissed, toggle: dismiss } = useRecoilToggle(browserWarningDismissedAtom)

  const nameAndVersion = useMemo(() => {
    const browser = Bowser.getParser(window?.navigator?.userAgent)
    const isSupportedBrowser = browser.satisfies({
      chrome: '>60',
      edge: '>79',
      firefox: '>52',
      safari: '>=16.5',
    })

    if (isSupportedBrowser || dismissed) {
      return null
    }

    const { name, version } = browser.getBrowser()
    return [name, version].filter(notUndefinedOrNull).join(' ')
  }, [dismissed])

  if (!nameAndVersion) {
    return null
  }

  return (
    <Modal centered isOpen backdrop="static" toggle={dismiss} fade={false} size="lg">
      <ModalHeader toggle={dismiss} tag="div">
        <h4 className="text-center text-danger">{t('Unsupported browser')}</h4>
      </ModalHeader>

      <ModalBody>
        <p>
          {t(
            'This browser version ({{nameAndVersion}}) is not supported, which means that it may lack capabilities necessary for {{project}} to operate.',
            { nameAndVersion, project: PROJECT_NAME },
          )}
        </p>

        <p>
          {t(
            'You can proceed, but the functioning of {{project}} and correctness of results cannot be guaranteed. Developers cannot investigate issues occurred when using this browser.',
            { project: PROJECT_NAME },
          )}
        </p>

        <p>
          {t('{{project}} works best in the latest versions of ', { project: PROJECT_NAME })}
          <LinkExternal href="https://www.google.com/chrome/">{'Chrome'}</LinkExternal>
          <span>{t(' and ')}</span>
          <LinkExternal href="https://www.mozilla.org/firefox/browsers/">{'Firefox'}</LinkExternal>
          <span>{t('. ')}</span>
          <span>{t('Please give them a try!')}</span>
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
