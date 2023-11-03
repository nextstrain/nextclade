import React from 'react'

import { Li, Ul } from 'src/components/Common/List'
import { ErrorContainer, ErrorMessage } from 'src/components/Error/ErrorStyles'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { DOMAIN, PROJECT_NAME } from 'src/constants'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function ErrorNetworkConnectionFailure({ url, message }: { url: string; message?: string }) {
  const { t } = useTranslationSafe()

  return (
    <ErrorContainer>
      <ErrorMessage>
        {message && <section> {message}</section>}

        <section className="mt-3">
          <div>
            {t('We tried to download the file from {{u}}', { u: '' })}
            <LinkExternal href={url}>{url}</LinkExternal>
            {t(' but were unable to establish a connection.')}
          </div>
        </section>

        <section className="mt-3">
          {t('Please verify that:')}
          <Ul>
            <Li>{t('You are connected to the internet')}</Li>
            <Li>{t('The address to the file is correct')}</Li>
            <Li>{t('The address to the file is reachable from your browser')}</Li>
            <Li>
              {t('There are no browser extensions interfering with network requests')}
              <sup>1</sup>
            </Li>
            <Li>
              {t('The server allows Cross-Origin Resource Sharing (CORS)')}
              <sup>2</sup>
            </Li>
            <Li>
              {t('There are no problems in domain name resolution of your server')}
              <sup>3</sup>
            </Li>
          </Ul>

          <small>
            <div>
              <span>
                <sup className="mr-1">1</sup>
              </span>

              {t(
                'Some of the adblocking browser extensions (AdBlock, uBlock, Privacy Badger and others) and privacy-oriented browsers (such as Brave) are known to prevent {{appName}} from making network requests to other servers. ' +
                  '{{appName}} respects your privacy, does not serve ads or collects personal data. ' +
                  'All computation is done inside your browser. You can safely disable adblockers on {{domain}} and/or allow {{domain}} to make network requests to your data source server.',
                { appName: PROJECT_NAME, domain: DOMAIN },
              )}
            </div>
            <div>
              <span>
                <sup className="mr-1">2</sup>
              </span>
              <LinkExternal href="https://en.wikipedia.org/wiki/Cross-origin_resource_sharing">
                {'en.wikipedia.org/wiki/Cross-origin_resource_sharing'}
              </LinkExternal>
            </div>
            <div>
              <span>
                <sup className="mr-1">3</sup>
              </span>
              <LinkExternal href="https://en.wikipedia.org/wiki/Name_server">
                {'en.wikipedia.org/wiki/Name_server'}
              </LinkExternal>
            </div>
          </small>
        </section>
      </ErrorMessage>
    </ErrorContainer>
  )
}
