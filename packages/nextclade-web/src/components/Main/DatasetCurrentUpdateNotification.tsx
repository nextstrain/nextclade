import type { Dataset } from 'src/types'
import { isNil } from 'lodash'
import path from 'path'
import React, { useCallback, useMemo } from 'react'
import { Button, Col, Row, UncontrolledAlert } from 'reactstrap'
import { useRecoilState, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetSingleCurrentAtom, datasetUpdatedAtom } from 'src/state/dataset.state'

export function DatasetCurrentUpdateNotification({ dataset }: { dataset: Dataset }) {
  const { t } = useTranslationSafe()
  const [datasetUpdated, setDatasetUpdated] = useRecoilState(datasetUpdatedAtom({ datasetName: dataset.path }))
  const setDatasetCurrent = useSetRecoilState(datasetSingleCurrentAtom)

  const onDatasetUpdateClicked = useCallback(() => {
    setDatasetCurrent(datasetUpdated)
    setDatasetUpdated(undefined)
  }, [datasetUpdated, setDatasetCurrent, setDatasetUpdated])

  const changelogUrl = useMemo(() => {
    if (
      isNil(datasetUpdated) ||
      isNil(datasetUpdated.path) ||
      isNil(datasetUpdated.files) ||
      isNil(datasetUpdated.files.changelog)
    ) {
      return undefined
    }
    const filename = path.basename(datasetUpdated.files.changelog)
    return `https://github.com/nextstrain/nextclade_data/blob/release/data/${datasetUpdated.path}/${filename}`
  }, [datasetUpdated])

  if (isNil(datasetUpdated)) {
    return null
  }

  return (
    <Row>
      <Col>
        <UncontrolledAlert closeClassName="d-none" fade={false} color="info" className="mx-1 py-2 px-2 d-flex w-100">
          <AlertTextWrapper>
            <p className="my-0">{t('A new version of this dataset is available.')}</p>
            {datasetUpdated.files?.changelog && (
              <p className="my-0">
                <LinkExternal href={changelogUrl}>{t("What's new?")}</LinkExternal>
              </p>
            )}
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
