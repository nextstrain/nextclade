import React from 'react'

import { ErrorGeneric } from 'src/components/Error/error-types/ErrorGeneric'
import { ErrorNetworkConnectionFailure } from 'src/components/Error/error-types/ErrorNetworkConnectionFailure'
import { ErrorNetworkRequestFailure } from 'src/components/Error/error-types/ErrorNetworkRequestFailure'
import { HttpRequestError } from 'src/io/axiosFetch'

export function ErrorContent({ error }: { error?: Error | string }) {
  if (!error) {
    return null
  }

  if (error instanceof HttpRequestError) {
    const url = error.request.url ?? 'Unknown URL'
    const status = error.response?.status
    if (!status) {
      return <ErrorNetworkConnectionFailure url={url} />
    }
    const statusText = error.response?.statusText ?? 'Unknown status'
    return <ErrorNetworkRequestFailure url={url} status={status} statusText={statusText} />
  }

  return <ErrorGeneric error={error} />
}
