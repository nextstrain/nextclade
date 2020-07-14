import React, { useMemo } from 'react'

import Head from 'next/head'

import { connect } from 'react-redux'
import { Helmet } from 'react-helmet'

import { DOMAIN, PROJECT_DESCRIPTION, PROJECT_NAME, SOCIAL_IMAGE_URL } from 'src/constants'

import { LocaleKey } from 'src/i18n/i18n'
import { State } from 'src/state/reducer'

export interface SEOProps {
  localeKey: LocaleKey
}

const mapStateToProps = (state: State) => ({
  localeKey: state.settings.localeKey,
})

const mapDispatchToProps = {}

export const SEO = connect(mapStateToProps, mapDispatchToProps)(SEODisconnected)

export function SEODisconnected({ localeKey }: SEOProps) {
  const htmlAttributes = useMemo(() => ({ lang: localeKey }), [localeKey])

  return (
    <>
      <Helmet htmlAttributes={htmlAttributes} />
      <Head>
        <title>{PROJECT_NAME}</title>

        <meta name="description" content={PROJECT_DESCRIPTION} />
        <meta name="application-name" content={PROJECT_NAME} />

        <meta itemProp="description" content={PROJECT_DESCRIPTION} />
        <meta itemProp="image" content={SOCIAL_IMAGE_URL} />
        <meta itemProp="name" content={PROJECT_NAME} />
        <meta property="og:description" content={PROJECT_DESCRIPTION} />
        <meta property="og:image" content={SOCIAL_IMAGE_URL} />
        <meta property="og:title" content={PROJECT_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={DOMAIN} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:description" content={PROJECT_DESCRIPTION} />
        <meta property="twitter:image" content={SOCIAL_IMAGE_URL} />
        <meta property="twitter:title" content={PROJECT_NAME} />
        <meta property="twitter:url" content={DOMAIN} />
      </Head>
    </>
  )
}
