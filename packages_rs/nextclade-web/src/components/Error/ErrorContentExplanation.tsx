import React from 'react'

import { useTranslation } from 'react-i18next'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { URL_GITHUB_ISSUES } from 'src/constants'

export function ErrorContentExplanation() {
  const { t } = useTranslation()

  return (
    <section className="mt-3">
      <span>{'If you think it is a bug, report it at '}</span>
      <span>
        <LinkExternal href={URL_GITHUB_ISSUES}>{URL_GITHUB_ISSUES}</LinkExternal>
      </span>
      <span>
        {t(
          ' so that developers could investigate this problem. Please provide as much details as possible about your input data, operating system, browser version and computer configuration. Include other details you deem useful for diagnostics. Share the example sequence data that allows to reproduce the problem, if possible.',
        )}
      </span>
    </section>
  )
}
