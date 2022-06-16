import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { UncontrolledAlert } from 'reactstrap'
import Bowser from 'bowser'

import { notUndefinedOrNull } from 'src/helpers/notUndefined'

export function BrowserWarning() {
  const { t } = useTranslation()

  const warningText = useMemo(() => {
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
    const nameAndVersion = [name, version].filter(notUndefinedOrNull).join(' ')

    return t(
      `This browser version (${nameAndVersion}) is not supported. Nextclade works best in the latest version of Chrome or Firefox.`,
    )
  }, [t])

  if (!warningText) {
    return null
  }

  return (
    <UncontrolledAlert color="warning" className="text-center m-0">
      {warningText}
    </UncontrolledAlert>
  )
}
