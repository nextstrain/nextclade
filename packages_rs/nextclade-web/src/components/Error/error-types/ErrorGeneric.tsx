import React, { useMemo } from 'react'
import serializeJavascript from 'serialize-javascript'

import { ErrorContainer, ErrorMessage, ErrorStack } from 'src/components/Error/ErrorStyles'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function getErrorDetails(error: unknown): {
  name: string
  message: string
  stack?: string
} {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }
  if (typeof error === 'string') {
    return { name: 'Error', message: error }
  }
  return { name: 'Error', message: serializeJavascript(error) }
}

export function ErrorGeneric({ error }: { error: Error | string }) {
  const { t } = useTranslationSafe()

  const { errorTitle, message, stackText } = useMemo(() => {
    const { name, message, stack } = getErrorDetails(error)

    let errorTitle = t('An error has occurred: {{errorName}}', { errorName: name })
    if (name.toLowerCase().trim() === 'error') {
      errorTitle = t('An error has occurred.')
    }

    const stackText = stack?.replace(/webpack-internal:\/{3}\.\//g, '')?.replace(/https?:\/\/(.+):\d+\//g, '')

    return { errorTitle, message, stackText }
  }, [error, t])

  return (
    <ErrorContainer>
      <h5>{errorTitle}</h5>
      <ErrorMessage>{message}</ErrorMessage>
      {process.env.NODE_ENV === 'development' && stackText && <ErrorStack>{stackText}</ErrorStack>}
    </ErrorContainer>
  )
}
