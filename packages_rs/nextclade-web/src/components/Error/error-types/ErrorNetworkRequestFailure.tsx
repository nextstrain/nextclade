import React from 'react'

import { ErrorContainer } from 'src/components/Error/ErrorStyles'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { getHttpStatusText } from 'src/helpers/getHttpStatusText'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function ErrorNetworkRequestFailure({
  url,
  status,
  statusText,
}: {
  url: string
  status: number
  statusText?: string
}) {
  const { t } = useTranslationSafe()

  const statusMessage = getHttpStatusText(t, status) ?? statusText

  return (
    <ErrorContainer>
      <h5>{t('An error has occurred: Network request failed')}</h5>

      <section className="mt-3">
        <div>{t('We tried to download the file from')}</div>
        <div>
          <LinkExternal href={url}>{url}</LinkExternal>
        </div>
        <div>{t('and the connection was successful, but the remote server replied with the following error:')}</div>
        <div className="text-danger">{statusMessage}</div>
      </section>
    </ErrorContainer>
  )
}
