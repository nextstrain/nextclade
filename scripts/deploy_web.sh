#!/usr/bin/env bash
set -euxo pipefail
shopt -s globstar
trap "exit" INT

: "${AWS_S3_BUCKET:?The environment variable is required}"
: "${AWS_CLOUDFRONT_DISTRIBUTION_ID:?The environment variable is required}"

export AWS_MAX_ATTEMPTS=10

pushd "packages_rs/nextclade-web/.build/production/web" >/dev/null

# Precompress files
pigz -kfrq .
find . -type f \( ! -iname "*.gz" -a ! -iname "*.br" \) | parallel brotli -kf || true

## Clear bucket
#aws s3 rm \
#  --recursive \
#  --only-show-errors \
#  "s3://${AWS_S3_BUCKET}/"

# Upload Next.js bundle: non-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --cache-control "max-age=2592000, public" \
  --metadata-directive REPLACE \
  --exclude "*.gz" \
  --exclude "*.br" \
  _next "s3://${AWS_S3_BUCKET}/_next"

# Upload Next.js bundle: gzip-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --cache-control "max-age=2592000, public" \
  --content-encoding gzip \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.gz" \
  _next "s3://${AWS_S3_BUCKET}/_next"

# Upload Next.js bundle: brotli-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --cache-control "max-age=2592000, public" \
  --content-encoding br \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.br" \
  _next "s3://${AWS_S3_BUCKET}/_next"




# Upload non-HTML files: non-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --cache-control "no-cache" \
  --metadata-directive REPLACE \
  --exclude "*.html" \
  --exclude "*.gz" \
  --exclude "*.br" \
  --exclude "_next" \
  . "s3://${AWS_S3_BUCKET}/"

# Upload non-HTML files: gzip-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --cache-control "no-cache" \
  --content-encoding gzip \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.gz" \
  --exclude "*.html*" \
  --exclude "_next" \
  . "s3://${AWS_S3_BUCKET}/"

# Upload non-HTML files: brotli-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --cache-control "no-cache" \
  --content-encoding br \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.br" \
  --exclude "*.html*" \
  --exclude "_next" \
  . "s3://${AWS_S3_BUCKET}/"



# Remove non-HTML files
find . -type f \( ! -iname "*.html" -a ! -iname "*.html.gz" -a ! -iname "*.html.br" \) -exec rm {} \+
rename --filename 's/\.html//' **/*.html || true
rename --filename 's/\.html//' **/*.html.gz || true
rename --filename 's/\.html//' **/*.html.br || true

# Upload HTML files: non-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --metadata-directive REPLACE \
  --exclude "*.*" \
  . "s3://${AWS_S3_BUCKET}/"

# Upload HTML files: gzip-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --content-encoding gzip \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.gz" \
  --exclude "*.*.gz" \
  . "s3://${AWS_S3_BUCKET}/"

# Upload HTML files: brotli-compressed
aws s3 sync \
  --delete \
  --only-show-errors \
  --content-type "text/html" \
  --cache-control "no-cache" \
  --content-encoding br \
  --metadata-directive REPLACE \
  --exclude "*" \
  --include "*.br" \
  --exclude "*.*.br" \
  . "s3://${AWS_S3_BUCKET}/"

# Update Cloudfront cache
aws cloudfront create-invalidation \
  --no-paginate \
  --distribution-id ${AWS_CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*" \
  >/dev/null

popd >/dev/null
