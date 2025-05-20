import React from 'react'
import { isNil } from 'lodash'
import { UncontrolledAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { autodetectErrorAtom } from 'src/state/autodetect.state'

export function SuggestionError({ ...restProps }) {
  const { t } = useTranslationSafe()
  const autodetectError = useRecoilValue(autodetectErrorAtom)
  if (isNil(autodetectError)) {
    return null
  }
  return (
    <Alert closeClassName="d-none" fade={false} color="danger" {...restProps}>
      <h6 className="font-weight-bold">{t('Suggestion algorithm failed.')}</h6>
      <p>{autodetectError.message}</p>
    </Alert>
  )
}

const Alert = styled(UncontrolledAlert)`
  margin: 0;
  padding: 0.75rem 1rem;
  width: 100%;

  p {
    margin: 0;
  }
`
