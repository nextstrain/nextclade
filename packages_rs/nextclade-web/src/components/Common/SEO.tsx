import React, { useMemo } from 'react'

import Head from 'next/head'

import { Helmet } from 'react-helmet'
import { useRecoilValue } from 'recoil'

import { DOMAIN, PROJECT_DESCRIPTION, PROJECT_NAME, URL_SOCIAL_IMAGE, TWITTER_USERNAME_FRIENDLY } from 'src/constants'
import { getLocaleWithKey } from 'src/i18n/i18n'

import { localeAtom } from 'src/state/locale.state'

export function SEO() {
  const locale = getLocaleWithKey(useRecoilValue(localeAtom))
  const htmlAttributes = useMemo(() => ({ lang: locale.full }), [locale])
  return (
    <>
      <Helmet htmlAttributes={htmlAttributes} />
      <Head>
        <title>{PROJECT_NAME}</title>

        <meta name="description" content={PROJECT_DESCRIPTION} />
        <meta name="application-name" content={PROJECT_NAME} />

        <meta itemProp="description" content={PROJECT_DESCRIPTION} />
        <meta itemProp="image" content={URL_SOCIAL_IMAGE} />
        <meta itemProp="name" content={PROJECT_NAME} />
        <meta property="og:description" content={PROJECT_DESCRIPTION} />
        <meta property="og:image" content={URL_SOCIAL_IMAGE} />
        <meta property="og:image:secure_url" content={URL_SOCIAL_IMAGE} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="600" />
        <meta property="og:locale" content={locale.full} />
        <meta property="og:title" content={PROJECT_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={DOMAIN} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:description" content={PROJECT_DESCRIPTION} />
        <meta name="twitter:image" content={URL_SOCIAL_IMAGE} />
        <meta name="twitter:image:alt" content={PROJECT_DESCRIPTION} />
        <meta name="twitter:title" content={PROJECT_NAME} />
        <meta name="twitter:url" content={DOMAIN} />
        <meta name="twitter:site" content={TWITTER_USERNAME_FRIENDLY} />
      </Head>
    </>
  )
}
