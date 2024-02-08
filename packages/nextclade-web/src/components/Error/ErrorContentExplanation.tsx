import React, { useMemo } from 'react'

import styled from 'styled-components'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import qs from 'querystring'
import Bowser from 'bowser'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { URL_GITHUB_ISSUES, SUPPORT_EMAIL, PROJECT_NAME } from 'src/constants'
import { getMemoryMegabytesAvailableString } from 'src/helpers/getNumThreads'
import { getVersionString } from 'src/helpers/getVersionString'

const ExplanationText = styled.section`
  overflow-wrap: break-word;
  word-wrap: break-word;
  -ms-hyphens: auto;
  -moz-hyphens: auto;
  -webkit-hyphens: auto;
  hyphens: auto;
`

export function getErrorStackText(error: Error) {
  return error?.stack?.replace(/webpack-internal:\/{3}\.\//g, '')?.replace(/https?:\/\/(.+):\d+\//g, '')
}

export function getErrorReportText(error: Error) {
  const bowser = typeof window !== 'undefined' ? Bowser.parse(window?.navigator?.userAgent) : 'N/A'

  return `
Error message: ${error.name}: ${error.message}

${PROJECT_NAME} ${getVersionString()}

Memory available: ${getMemoryMegabytesAvailableString()}

User agent: ${typeof window !== 'undefined' ? window?.navigator?.userAgent : 'unknown'}

Browser details: ${JSON.stringify(bowser)}

Call stack:

${getErrorStackText(error) ?? 'N/A'}
  `
}

export function ErrorContentExplanation({ error }: { error?: Error }) {
  const { t } = useTranslation()

  const emailLink = useMemo(() => {
    let query = ''

    if (error) {
      const subject = `${PROJECT_NAME} error: ${error.name} ${error.message}`

      const body = `Hello ${PROJECT_NAME} team,

I just received this error in ${PROJECT_NAME}.

The error happened when ...

Here are some additional details ${PROJECT_NAME} asked to add:

${getErrorReportText(error)}
    `

      query = qs.stringify({
        subject,
        body,
      })
    }

    return `mailto:${SUPPORT_EMAIL}?${query}`
  }, [error])

  return (
    <ExplanationText className="mt-3">
      <span>
        {t('You can report this error to developers by creating a new issue at: ')}
        <LinkExternal href={URL_GITHUB_ISSUES}>{URL_GITHUB_ISSUES}</LinkExternal>
      </span>
      <span>{t(' or by writing an email to ')}</span>
      <span>
        <LinkExternal href={emailLink}>{SUPPORT_EMAIL}</LinkExternal>
      </span>
      <span>
        {t(
          ' so that developers could investigate this problem. Please provide as many details as possible about your input data, operating system, browser version and computer configuration. Include other details you deem useful for diagnostics. Share the example sequence data that allows to reproduce the problem, if possible.',
        )}
      </span>
    </ExplanationText>
  )
}
