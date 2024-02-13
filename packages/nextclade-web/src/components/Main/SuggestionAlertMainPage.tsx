import React, { useMemo } from 'react'
import { Col, Row, UncontrolledAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { useDatasetSuggestionResults } from 'src/hooks/useRunSeqAutodetect'
import { AutodetectRunState, autodetectRunStateAtom } from 'src/state/autodetect.state'

export function SuggestionAlertMainPage({ ...restProps }) {
  const { t } = useTranslationSafe()
  const datasetCurrent = useRecoilValue(datasetCurrentAtom)
  const { numSuggestions, datasetsActive: datasetSuggestions } = useDatasetSuggestionResults()
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)

  // eslint-disable-next-line sonarjs/cognitive-complexity
  const alert = useMemo(() => {
    const hasMatch = datasetCurrent && datasetSuggestions.some((suggestion) => suggestion.path === datasetCurrent.path)

    if (autodetectRunState === AutodetectRunState.Failed) {
      return (
        <Alert closeClassName="d-none" fade={false} color="danger">
          <h6 className="font-weight-bold">{t('Suggestion algorithm failed.')}</h6>
          <p className="small">{t('Please report this to developers.')}</p>
        </Alert>
      )
    }

    if (autodetectRunState === AutodetectRunState.Done) {
      if (datasetCurrent) {
        // There is more than one suggestion and selected dataset is NOT among them
        if (!hasMatch && numSuggestions > 0) {
          let text = t(
            'Currently selected dataset does not seem to match your sequences, ' +
              'but there are {{ n }} other datasets which might. Click "Change reference dataset" to see the list.',
            { n: numSuggestions },
          )

          if (numSuggestions === 1) {
            text = t(
              'Currently selected dataset does not seem to match your sequences, ' +
                'but there is 1 dataset which might. Click "Change reference dataset" to see the list.',
            )
          }

          return (
            <Alert closeClassName="d-none" fade={false} color="warning">
              <h6 className="font-weight-bold">{t('Possible dataset mismatch detected.')}</h6>
              <p className="small">{text}</p>
            </Alert>
          )
        }

        // There is more than one suggestion and selected dataset is among them
        if (numSuggestions > 1) {
          return (
            <Alert closeClassName="d-none" fade={false} color="primary">
              <h6 className="font-weight-bold">{t('Multiple matching datasets.')}</h6>
              <p className="small">
                {t(
                  '{{ n }} datasets appear to match your sequences. Click "Change reference dataset" to see the list.',
                  {
                    n: numSuggestions,
                  },
                )}
              </p>
            </Alert>
          )
        }
      }

      // There is no suggestions
      if (numSuggestions === 0) {
        if (datasetCurrent) {
          return (
            <Alert closeClassName="d-none" fade={false} color="danger">
              <h6 className="font-weight-bold">{t('Possible dataset mismatch detected.')}</h6>
              <p className="small">
                {t(
                  'Currently selected dataset does not seem to match your sequences and suggestion algorithm was unable to find any alternatives. Select a dataset manually. If there is no suitable dataset, consider creating and contributing one to Nextclade community dataset collection.',
                )}
              </p>
            </Alert>
          )
        }
        return (
          <Alert closeClassName="d-none" fade={false} color="danger">
            <h6 className="font-weight-bold">{t('No matching datasets.')}</h6>
            <p className="small">
              {t(
                'Suggestion algorithm was unable to find a dataset suitable for your sequences. Select a dataset manually. If there is no suitable dataset, consider creating and contributing one to Nextclade community dataset collection.',
              )}
            </p>
          </Alert>
        )
      }
    }

    return null
  }, [autodetectRunState, datasetCurrent, datasetSuggestions, numSuggestions, t])

  if (!alert) {
    return null
  }

  return (
    <Row noGutters className="my-1">
      <Col>
        <AlertWrapper {...restProps}>{alert}</AlertWrapper>
      </Col>
    </Row>
  )
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
