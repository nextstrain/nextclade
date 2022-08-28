/* eslint-disable prefer-destructuring */
// Implements page redirect.
//
// Usage:
// Create an AWS Lambda function and attach it to "Viewer Request" event of a
// Cloudfront distribution

const PAGES_TO_REDIRECT = ['/results', '/tree']

async function handler(event) {
  const request = event.Records[0].cf.request
  const host = request.headers.host[0].value
  if (PAGES_TO_REDIRECT.some((page) => request.uri.endsWith(page))) {
    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        location: [
          {
            key: 'Location',
            value: `https://${host}/`,
          },
        ],
      },
    }
  }
  return request
}

exports.handler = handler
