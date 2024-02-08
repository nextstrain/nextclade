import React, { useMemo } from 'react'
import { UncontrolledAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useDatasetSuggestionResults } from 'src/hooks/useRunSeqAutodetect'
import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'

export function SuggestionAlertDatasetPage({ ...restProps }) {
  const { t } = useTranslationSafe()
  const { numSuggestions } = useDatasetSuggestionResults()
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)

  const alert = useMemo(() => {
    if (autodetectRunState === AutodetectRunState.Done) {
      if (numSuggestions === 0) {
        return (
          <Alert closeClassName="d-none" fade={false} color="danger">
            <p className="small">
              {t(
                'No datasets match your data. Select a dataset manually. If there is no suitable dataset, consider creating one and contributing it to Nextclade community dataset collection.',
              )}
            </p>
          </Alert>
        )
      }
      if (numSuggestions > 1) {
        return (
          <Alert closeClassName="d-none" fade={false} color="none">
            <p className="small">
              {t('{{ n }} datasets appear to match your data. Select the one to use.', {
                n: numSuggestions,
              })}
            </p>
          </Alert>
        )
      }
    }
    if (autodetectRunState === AutodetectRunState.Failed) {
      return (
        <Alert closeClassName="d-none" fade={false} color="danger">
          <p className="small">{t('Suggestion algorithm failed. Please report this to developers.')}</p>
        </Alert>
      )
    }

    return null
  }, [autodetectRunState, numSuggestions, t])

  return <AlertWrapper {...restProps}>{alert}</AlertWrapper>
}

const AlertWrapper = styled.div`
  display: flex;
  width: 100%;
`

const Alert = styled(UncontrolledAlert)`
  margin: 0;
  padding: 0.75rem 1rem;
  width: 100%;

  p {
    margin: 0;
  }
`
