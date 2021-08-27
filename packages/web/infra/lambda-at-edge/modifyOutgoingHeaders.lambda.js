/* eslint-disable prefer-destructuring */
// Adds additional headers to the response, including security headers.
// Suited for websites.
//
// Usage: Create an AWS Lambda@Edge function and attach it to "Viewer Response" event of a Cloudfront distribution

const FEATURE_POLICY = {
  'accelerometer': `'none'`,
  'autoplay': `'none'`,
  'camera': `'none'`,
  'document-domain': `'none'`,
  'encrypted-media': `'none'`,
  'fullscreen': `'none'`,
  'geolocation': `'none'`,
  'gyroscope': `'none'`,
  'magnetometer': `'none'`,
  'microphone': `'none'`,
  'midi': `'none'`,
  'payment': `'none'`,
  'picture-in-picture': `'none'`,
  'sync-xhr': `'none'`,
  'usb': `'none'`,
  'xr-spatial-tracking': `'none'`,
}

function generateFeaturePolicyHeader(featurePoicyObject) {
  return Object.entries(featurePoicyObject)
    .map(([policy, value]) => `${policy} ${value}`)
    .join('; ')
}

const NEW_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.githubusercontent.com; connect-src *",
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=15768000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'off',
  'X-Download-Options': 'noopen',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Feature-Policy': generateFeaturePolicyHeader(FEATURE_POLICY),
}

function addHeaders(headersObject) {
  return Object.entries(headersObject).reduce(
    (result, [header, value]) => ({
      ...result,
      [header.toLowerCase()]: [{ key: header, value }],
    }),
    {},
  )
}

const HEADERS_TO_REMOVE = new Set(['server', 'via'])

function filterHeaders(headers) {
  return Object.entries(headers).reduce((result, [key, value]) => {
    if (HEADERS_TO_REMOVE.has(key.toLowerCase())) {
      return result
    }

    if (key.toLowerCase().includes('powered-by')) {
      return result
    }

    return { ...result, [key.toLowerCase()]: value }
  }, {})
}

function modifyHeaders({ request, response }) {
  let newHeaders = addHeaders(NEW_HEADERS)

  newHeaders = {
    ...response.headers,
    ...newHeaders,
  }

  newHeaders = filterHeaders(newHeaders)

  const url = request.uri || request.url
  if (url.startsWith('/_next')) {
    const cacheHeaders = addHeaders({
      'Cache-Control': 'public,max-age=31536000,immutable',
    })

    newHeaders = {
      ...newHeaders,
      ...cacheHeaders,
    }
  }

  return newHeaders
}

exports.handler = (event, context, callback) => {
  const { request, response } = event.Records[0].cf
  response.headers = modifyHeaders({ request, response })
  callback(null, response)
}

exports.modifyHeaders = modifyHeaders
