import React, { useMemo } from 'react'
import { Col, Row, UncontrolledAlert } from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { SuggestionError } from 'src/components/Main/SuggestionError'
import { datasetSingleCurrentAtom } from 'src/state/dataset.state'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import {
  AutodetectRunState,
  autodetectRunStateAtom,
  numberTopSuggestedDatasetsAtom,
  topSuggestedDatasetsAtom,
} from 'src/state/autodetect.state'

export function SuggestionAlertMainPage({ ...restProps }) {
  const { t } = useTranslationSafe()
  const datasetSingleCurrent = useRecoilValue(datasetSingleCurrentAtom)
  const topSuggestedDatasets = useRecoilValue(topSuggestedDatasetsAtom)
  const numberTopSuggestedDatasets = useRecoilValue(numberTopSuggestedDatasetsAtom)
  const autodetectRunState = useRecoilValue(autodetectRunStateAtom)

  const alert = useMemo(() => {
    const hasMatch =
      datasetSingleCurrent && topSuggestedDatasets.some((suggestion) => suggestion.path === datasetSingleCurrent.path)

    if (autodetectRunState === AutodetectRunState.Failed) {
      return <SuggestionError />
    }

    if (autodetectRunState === AutodetectRunState.Done) {
      if (datasetSingleCurrent) {
        // There is more than one suggestion and selected dataset is NOT among them
        if (!hasMatch && numberTopSuggestedDatasets > 0) {
          let text = t(
            'Currently selected dataset does not seem to match your sequences, ' +
              'but there are {{ n }} other datasets which might. Click "Change reference dataset" to see the list.',
            { n: numberTopSuggestedDatasets },
          )

          if (numberTopSuggestedDatasets === 1) {
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
        if (numberTopSuggestedDatasets > 1) {
          return (
            <Alert closeClassName="d-none" fade={false} color="primary">
              <h6 className="font-weight-bold">{t('Multiple matching datasets.')}</h6>
              <p className="small">
                {t(
                  '{{ n }} datasets appear to match your sequences. Click "Change reference dataset" to see the list or use the "Multiple dataset" mode to analyze your data.',
                  {
                    n: numberTopSuggestedDatasets,
                  },
                )}
              </p>
            </Alert>
          )
        }
      }

      // There are no suggestions
      if (numberTopSuggestedDatasets === 0) {
        if (datasetSingleCurrent) {
          return (
            <Alert closeClassName="d-none" fade={false} color="danger">
              <h6 className="font-weight-bold">{t('Possible dataset mismatch detected.')}</h6>
              <p className="small">
                {t(
                  'Currently selected dataset does not seem to match your sequences, and the suggestion algorithm was unable to find any alternatives. Select a dataset manually. If there is no suitable dataset, consider creating and contributing one to the Nextclade community dataset collection.',
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
                'Suggestion algorithm was unable to find a dataset suitable for your sequences. Select a dataset manually. If there is no suitable dataset, consider creating and contributing one to the Nextclade community dataset collection.',
              )}
            </p>
          </Alert>
        )
      }
    }

    return null
  }, [autodetectRunState, datasetSingleCurrent, topSuggestedDatasets, numberTopSuggestedDatasets, t])

  if (!alert) {
    return null
  }

  return (
    <Row className="my-1">
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
