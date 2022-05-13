import React, { ReactNode } from 'react'

import { ErrorBoundary as ErrorBoundaryBase } from 'react-error-boundary'
import ErrorPage from 'src/pages/_error'

export function ErrorFallback() {
  return <ErrorPage />
}

export interface ErrorBoundaryProps {
  children?: ReactNode
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return <ErrorBoundaryBase FallbackComponent={ErrorFallback}>{children}</ErrorBoundaryBase>
}
