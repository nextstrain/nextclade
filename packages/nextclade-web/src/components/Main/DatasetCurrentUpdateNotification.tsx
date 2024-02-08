import { isNil } from 'lodash'
import React, { useCallback } from 'react'
import { Button, Col, Row, UncontrolledAlert } from 'reactstrap'
import { useRecoilState, useSetRecoilState } from 'recoil'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetCurrentAtom, datasetUpdatedAtom } from 'src/state/dataset.state'
import styled from 'styled-components'

export function DatasetCurrentUpdateNotification() {
  const { t } = useTranslationSafe()
  const [datasetUpdated, setDatasetUpdated] = useRecoilState(datasetUpdatedAtom)
  const setDatasetCurrent = useSetRecoilState(datasetCurrentAtom)

  const onDatasetUpdateClicked = useCallback(() => {
    setDatasetCurrent(datasetUpdated)
    setDatasetUpdated(undefined)
  }, [datasetUpdated, setDatasetCurrent, setDatasetUpdated])

  if (isNil(datasetUpdated)) {
    return null
  }

  return (
    <Row noGutters>
      <Col>
        <UncontrolledAlert closeClassName="d-none" fade={false} color="info" className="mx-1 py-2 px-2 d-flex w-100">
          <AlertTextWrapper>
            <p className="my-0">{t('A new version of this dataset is available.')}</p>
            <p className="my-0">
              <LinkExternal href="https://github.com/nextstrain/nextclade_data/blob/release/CHANGELOG.md">
                {"What's new?"}
              </LinkExternal>
            </p>
          </AlertTextWrapper>

          <AlertButtonWrapper>
            <ChangeButton
              type="button"
              color="info"
              title={t('Accept the updated dataset')}
              onClick={onDatasetUpdateClicked}
            >
              {t('Update')}
            </ChangeButton>
          </AlertButtonWrapper>
        </UncontrolledAlert>
      </Col>
    </Row>
  )
}

const AlertTextWrapper = styled.div`
  flex: 1;
`

const AlertButtonWrapper = styled.div`
  flex: 0;
`

const ChangeButton = styled(Button)`
  flex: 0 0 auto;
  height: 2.1rem;
  min-width: 100px;
  margin-left: auto;
`
