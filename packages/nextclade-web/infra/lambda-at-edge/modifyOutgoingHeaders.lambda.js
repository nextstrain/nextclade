// Adds additional headers to the response, including security headers.
// Suited for websites.
//
// See also:
//  - https://securityheaders.com/
//
// Usage: Create an AWS Lambda@Edge function and attach it to "Viewer Response"
// event of a Cloudfront distribution

const PERMISSIONS_POLICY = {
  accelerometer: '()',
  camera: '()',
  geolocation: '()',
  gyroscope: '()',
  magnetometer: '()',
  microphone: '()',
  payment: '()',
  usb: '()',
}

function generatePermissionsPolicyHeader(permissionsPolicyObject) {
  return Object.entries(permissionsPolicyObject)
    .map(([policy, value]) => `${policy}=${value}`)
    .join(', ')
}

const NEW_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-eval' plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: *.githubusercontent.com; connect-src *",
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=15768000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'off',
  'X-Download-Options': 'noopen',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': generatePermissionsPolicyHeader(PERMISSIONS_POLICY),
}

function addHeaders(headersObject) {
  return Object.fromEntries(
    Object.entries(headersObject).map(([header, value]) => [header.toLowerCase(), [{ key: header, value }]]),
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

function modifyHeaders({ /* request, */ response }) {
  let newHeaders = addHeaders(NEW_HEADERS)

  newHeaders = {
    ...response.headers,
    ...newHeaders,
  }

  newHeaders = filterHeaders(newHeaders)

  return newHeaders
}

exports.handler = (event, context, callback) => {
  const { request, response } = event.Records[0].cf
  response.headers = modifyHeaders({ request, response })
  callback(null, response)
}

exports.modifyHeaders = modifyHeaders
