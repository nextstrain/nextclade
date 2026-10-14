import React, { ReactNode, useCallback } from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { Button } from 'reactstrap'
import styled from 'styled-components'
import { sanitizeError } from 'src/helpers/sanitizeError'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { theme } from 'src/theme'

export interface TreePanelErrorBoundaryProps {
  /** What the panel shows, for the error message, e.g. "the tree" */
  subject: string
  children: ReactNode
}

/**
 * Catches errors in drawing one panel of the tree page (the tree, or the entropy chart), so the other panels and the
 * sidebar stay usable. The message offers to draw the panel again
 */
export function TreePanelErrorBoundary({ subject, children }: TreePanelErrorBoundaryProps) {
  const FallbackComponent = useCallback(
    (props: FallbackProps) => <TreePanelError subject={subject} {...props} />,
    [subject],
  )
  const onError = useCallback((error: unknown) => console.error(error), [])
  return (
    <ErrorBoundary FallbackComponent={FallbackComponent} onError={onError}>
      {children}
    </ErrorBoundary>
  )
}

function TreePanelError({ subject, error, resetErrorBoundary }: FallbackProps & { subject: string }) {
  const { t } = useTranslationSafe()
  const { message } = sanitizeError(error)
  return (
    <ErrorContainer role="alert">
      <h5>{t('Unable to draw {{subject}}', { subject })}</h5>
      <ErrorMessage>{message}</ErrorMessage>
      <Button color="secondary" size="sm" onClick={resetErrorBoundary}>
        {t('Try again')}
      </Button>
    </ErrorContainer>
  )
}

/** A section, not a div: the panel wrapper restyles its last div child, which is the Auspice card */
const ErrorContainer = styled.section`
  margin: 26px 16px 16px 0;
  padding: 12px 16px;
  border: 1px solid ${theme.danger};
  border-radius: 4px;
`

const ErrorMessage = styled.pre`
  margin: 0 0 12px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`
