import React from 'react'

import NextDocument, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

import {
  PROJECT_NAME,
  PROJECT_DESCRIPTION,
  URL_SOCIAL_IMAGE,
  DOMAIN,
  TWITTER_USERNAME_FRIENDLY,
  URL_MANIFEST_JSON,
  URL_FAVICON,
} from 'src/constants'

export const GenericIcons = [16, 32, 96, 128, 196].map((size) => {
  const sizes = `${size}x${size}`
  return <link key={size} rel="icon" type="image/png" sizes={sizes} href={`${DOMAIN}/icons/favicon-${sizes}.png`} />
})

export const AppleIcons = [57, 60, 72, 76, 114, 120, 144, 152, 180].map((size) => {
  const sizes = `${size}x${size}`
  return (
    <React.Fragment key={size}>
      <link rel="apple-touch-icon" sizes={sizes} href={`${DOMAIN}/icons/apple-touch-icon-${sizes}.png`} />
      <link sizes={sizes} href={`${DOMAIN}/icons/apple-touch-icon-${sizes}-precomposed.png`} />
    </React.Fragment>
  )
})

export const MicrosoftIcons = (
  <>
    <meta name="msapplication-config" content={`${DOMAIN}/browserconfig.xml`} />
    <meta name="msapplication-TileColor" content="#2b5797" />
    <meta name="msapplication-square70x70logo" content={`${DOMAIN}/icons/mstile-70x70.png`} />
    <meta name="msapplication-TileImage" content={`${DOMAIN}/icons/mstile-144x144.png`} />
    <meta name="msapplication-square150x150logo" content={`${DOMAIN}/icons/mstile-150x150.png`} />
    <meta name="msapplication-wide310x150logo" content={`${DOMAIN}/icons/mstile-310x150.png`} />
    <meta name="msapplication-square310x310logo" content={`${DOMAIN}/icons/mstile-310x310.png`} />
  </>
)

const disableErrorPopup = {
  __html: `
    window.addEventListener('error', event => {
      event.stopImmediatePropagation()
    })

    window.addEventListener('unhandledrejection', event => {
      event.stopImmediatePropagation()
    })
  `,
}

/**
 *
 * Prevent indexing by search engines
 * https://developers.google.com/search/docs/crawling-indexing/block-indexing
 *
 */
function NoIndex() {
  if (process.env.BLOCK_SEARCH_INDEXING !== '1') {
    return null
  }
  return <meta name="robots" content="noindex" />
}

/**
 * Disables Next.js error popup in dev mode, so that the behavior is consistent with production.
 * Put this component into Document's Head.
 */
export function DisableNextJsErrorPopup() {
  if (process.env.NODE_ENV === 'production') {
    return null
  }
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={disableErrorPopup} />
}

export default class Document extends NextDocument {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet()
    const originalRenderPage = ctx.renderPage

    try {
      ctx.renderPage = () =>
        originalRenderPage({ enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />) })
      const initialProps = await NextDocument.getInitialProps(ctx)
      const styles = [initialProps.styles, sheet.getStyleElement()]
      return { ...initialProps, styles }
    } finally {
      sheet.seal()
    }
  }

  render() {
    const localeFull = 'en_US'

    return (
      <Html lang="en">
        <Head>
          <DisableNextJsErrorPopup />

          <NoIndex />
          <link rel="canonical" href={DOMAIN} />

          <meta charSet="utf8" />
          <title>{PROJECT_NAME}</title>
          <meta name="description" content={PROJECT_DESCRIPTION} />
          <meta name="application-name" content={PROJECT_NAME} />
          <meta name="theme-color" content="#ffffff" />

          <link rel="manifest" href={URL_MANIFEST_JSON} />
          <link rel="shortcut icon" href={URL_FAVICON} />

          {GenericIcons}

          {AppleIcons}
          <link rel="mask-icon" href={`${DOMAIN}/icons/safari-pinned-tab.svg" color="#555555`} />

          {MicrosoftIcons}

          <meta itemProp="description" content={PROJECT_DESCRIPTION} />
          <meta itemProp="image" content={URL_SOCIAL_IMAGE} />
          <meta itemProp="name" content={PROJECT_NAME} />
          <meta property="og:description" content={PROJECT_DESCRIPTION} />
          <meta property="og:image" content={URL_SOCIAL_IMAGE} />
          <meta property="og:image:secure_url" content={URL_SOCIAL_IMAGE} />
          <meta property="og:image:type" content="image/png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="600" />
          <meta property="og:locale" content={localeFull} />
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

        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
