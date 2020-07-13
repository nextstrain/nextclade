import React, { useMemo } from 'react'

import { connect } from 'react-redux'
import { Helmet } from 'react-helmet'

import { PROJECT_DESCRIPTION, PROJECT_NAME } from 'src/constants'
import { LocaleKey } from 'src/i18n/i18n'
import { State } from 'src/state/reducer'

const PROJECT_FULL_DOMAIN = process.env.PROJECT_FULL_DOMAIN ?? ''

export interface SEOProps {
  localeKey: LocaleKey
}

const mapStateToProps = (state: State) => ({
  localeKey: state.settings.localeKey,
})

const mapDispatchToProps = {}

export const SEO = connect(mapStateToProps, mapDispatchToProps)(SEODisconnected)

export function SEODisconnected({ localeKey }: SEOProps) {
  const socialImageUrl = useMemo(() => '/social-1200x600.png', [])
  const htmlAttributes = useMemo(() => ({ lang: localeKey }), [localeKey])

  return (
    <Helmet htmlAttributes={htmlAttributes}>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <title>{PROJECT_NAME}</title>
      <meta name="description" content={PROJECT_DESCRIPTION} />
      <meta name="application-name" content="Nextclade" />
      <meta name="theme-color" content="#ffffff" />

      <link rel="manifest" href="/site.webmanifest" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
      <link rel="icon" type="image/png" href="/icons/favicon-16x16.png" sizes="16x16" />
      <link rel="icon" type="image/png" href="/icons/favicon-32x32.png" sizes="32x32" />
      <link rel="icon" type="image/png" href="/icons/favicon-96x96.png" sizes="96x96" />
      <link rel="icon" type="image/png" href="/icons/favicon-128x128.png" sizes="128x128" />
      <link rel="icon" type="image/png" href="/icons/favicon-196x196.png" sizes="196x196" />

      <link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-touch-icon-57x57.png" />
      <link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-touch-icon-60x60.png" />
      <link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-touch-icon-72x72.png" />
      <link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-touch-icon-76x76.png" />
      <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-touch-icon-114x114.png" />
      <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
      <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon-144x144.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
      <link rel="apple-touch-icon-precomposed" sizes="57x57" href="/icons/apple-touch-icon-57x57-precomposed.png" />
      <link rel="apple-touch-icon-precomposed" sizes="60x60" href="/icons/apple-touch-icon-60x60-precomposed.png" />
      <link rel="apple-touch-icon-precomposed" sizes="72x72" href="/icons/apple-touch-icon-72x72-precomposed.png" />
      <link rel="apple-touch-icon-precomposed" sizes="76x76" href="/icons/apple-touch-icon-76x76-precomposed.png" />
      <link rel="apple-touch-icon-precomposed" sizes="114x114" href="/icons/apple-touch-icon-114x114-precomposed.png" />
      <link rel="apple-touch-icon-precomposed" sizes="120x120" href="/icons/apple-touch-icon-120x120-precomposed.png" />
      <link rel="apple-touch-icon-precomposed" sizes="144x144" href="/icons/apple-touch-icon-144x144-precomposed.png" />
      <link rel="apple-touch-icon-precomposed" sizes="152x152" href="/icons/apple-touch-icon-152x152-precomposed.png" />
      <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#555555" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black" />

      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="msapplication-TileColor" content="#2b5797" />
      <meta name="msapplication-square70x70logo" content="/icons/mstile-70x70.png" />
      <meta name="msapplication-TileImage" content="/icons/mstile-144x144.png" />
      <meta name="msapplication-square150x150logo" content="/icons/mstile-150x150.png" />
      <meta name="msapplication-wide310x150logo" content="/icons/mstile-310x150.png" />
      <meta name="msapplication-square310x310logo" content="/icons/mstile-310x310.png" />

      <meta itemProp="description" content={PROJECT_DESCRIPTION} />
      <meta itemProp="image" content={socialImageUrl} />
      <meta itemProp="name" content={PROJECT_NAME} />
      <meta property="og:description" content={PROJECT_DESCRIPTION} />
      <meta property="og:image" content={socialImageUrl} />
      <meta property="og:title" content={PROJECT_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={PROJECT_FULL_DOMAIN} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:description" content={PROJECT_DESCRIPTION} />
      <meta property="twitter:image" content={socialImageUrl} />
      <meta property="twitter:title" content={PROJECT_NAME} />
      <meta property="twitter:url" content={PROJECT_FULL_DOMAIN} />
    </Helmet>
  )
}
