import React, { useMemo } from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { transparentize, darken } from 'polished'
import { Button } from 'reactstrap'

import { useReloadPage } from 'src/hooks/useReloadPage'

export const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;

  & a {
    overflow-wrap: anywhere;
  }
`

export const ErrorMessage = styled.p`
  padding: 1rem;
  border-radius: 3px;
  background-color: ${(props) => transparentize(0.75)(props.theme.danger)};
  color: ${(props) => darken(0.2)(props.theme.danger)};
  overflow-wrap: break-word;
  word-break: normal;
`

export const ErrorMessageMonospace = styled.pre`
  white-space: pre-wrap;
`

export function RestartButton() {
  const { t } = useTranslationSafe()
  const reload = useReloadPage('/')

  return useMemo(
    () => (
      <Button
        className="ml-auto"
        type="button"
        color="danger"
        title={t('Reload the page and start Nextclade fresh')}
        onClick={reload}
      >
        {t('Restart Nextclade')}
      </Button>
    ),
    [reload, t],
  )
}
