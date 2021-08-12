// Implements rewrite of non-gz to gz URLs using AWS Lambda@Edge.
//
// Usage: Create an AWS Lambda function and attach it to "Viewer Request" event of a Cloudfront distribution

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request

  // All dataset files except .zip are gzip-compressed.
  // Here we rewrite the URL to get the corresponding .gz files.
  if(!request.uri.endsWith('.zip')) {
    request.uri += '.gz'
    callback(null, request)
  }
}
