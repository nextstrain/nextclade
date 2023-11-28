import React, { useMemo } from 'react'
import { UncontrolledAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useDatasetSuggestionResults } from 'src/hooks/useRunSeqAutodetect'
import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'

export function SuggestionAlertMainPage({ ...restProps }) {
  const { t } = useTranslationSafe()
  const { numSuggestions } = useDatasetSuggestionResults()
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)

  const alert = useMemo(() => {
    if (autodetectRunState === AutodetectRunState.Done) {
      if (numSuggestions === 0) {
        return (
          <Alert closeClassName="d-none" fade={false} color="danger">
            <h6 className="font-weight-bold">{t('No matching datasets.')}</h6>
            <p className="small">
              {t(
                'Suggestion algorithm was unable to find a matching dataset. Select a dataset manually. If there is no suitable dataset, consider creating and contributing one to Nextclade community dataset collection.',
              )}
            </p>
          </Alert>
        )
      }
      if (numSuggestions > 1) {
        return (
          <Alert closeClassName="d-none" fade={false} color="info">
            <h6 className="font-weight-bold">{t('Multiple matching datasets.')}</h6>
            <p className="small">
              {t('{{ n }} datasets appear to match your data. Click "Change dataset" to select the one to use.', {
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
          <h6 className="font-weight-bold">{t('Suggestion algorithm failed.')}</h6>
          <p className="small">{t('Please report this to developers.')}</p>
        </Alert>
      )
    }

    return null
  }, [autodetectRunState, numSuggestions, t])

  return <AlertWrapper {...restProps}>{alert}</AlertWrapper>
}

const AlertWrapper = styled.div`
  display: flex;
`

const Alert = styled(UncontrolledAlert)`
  margin: 0;
  padding: 0.75rem 1rem;
  width: 100%;

  p {
    margin: 0;
  }
`
