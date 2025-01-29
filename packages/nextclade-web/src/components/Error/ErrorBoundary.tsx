import React, { ReactNode, useState, useCallback, useMemo, ErrorInfo } from 'react'
import { ErrorBoundary as ErrorBoundaryBase, FallbackProps } from 'react-error-boundary'
import ErrorPage from 'src/pages/_error'

export interface ExtendedFallbackProps extends FallbackProps {
  errorInfo?: ErrorInfo
}

export function ErrorFallback({ error, errorInfo }: ExtendedFallbackProps) {
  return <ErrorPage error={error} errorInfo={errorInfo} />
}

export interface ErrorBoundaryProps {
  children?: ReactNode
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | undefined>(undefined)

  const FallbackComponent = useMemo(() => {
    return function ErrorFallbackMemoized(props: FallbackProps) {
      return <ErrorFallback {...props} errorInfo={errorInfo} />
    }
  }, [errorInfo])

  const handleError = useCallback((_: Error, info: ErrorInfo) => {
    setErrorInfo(info)
  }, [])

  const handleReset = useCallback(() => {
    setErrorInfo(undefined)
  }, [])

  return (
    <ErrorBoundaryBase FallbackComponent={FallbackComponent} onError={handleError} onReset={handleReset}>
      {children}
    </ErrorBoundaryBase>
  )
}
