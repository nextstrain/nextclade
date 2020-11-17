import React from 'react'

import { useTranslation } from 'react-i18next'
import { Col } from 'reactstrap'
import {
  ButtonClear,
  ButtonContainer,
  ButtonDownload,
  ColFlexHorizontal,
  ColFlexVertical,
  Form,
  Label,
  Row,
  RowFill,
  TextInputMonospace,
} from 'src/components/Main/FilePicker'
import { TabPanel } from 'src/components/Main/FilePickerTabs'

export interface TabPanelPasteProps {
  seqData: ''

  onSeqDataChange(seqData: string): void
}

export function TabPanelPaste({ seqData, onSeqDataChange }: TabPanelPasteProps) {
  const { t } = useTranslation()

  const hasSeqData = seqData.length > 0

  return (
    <Form>
      <RowFill noGutter>
        <ColFlexVertical>
          <Row noGutter>
            <Col className="d-flex">
              <Label className="mr-auto" htmlFor="sequence-input">
                {t('Enter sequence data in FASTA format')}
              </Label>
            </Col>
          </Row>

          <RowFill noGutter>
            <Col className="d-flex flex-sm-column">
              <TextInputMonospace
                id="sequence-input"
                className="flex-grow-1"
                type="textarea"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-gramm="false"
                wrap="off"
                data-gramm_editor="false"
                value={seqData}
                onChange={onSeqDataChange}
              />
            </Col>
          </RowFill>

          <Row noGutter>
            <ColFlexHorizontal>
              <ButtonContainer>
                <ButtonClear disabled={!hasSeqData} type="button" color="secondary" title={t('Clear the text field')}>
                  {t('Clear')}
                </ButtonClear>

                <ButtonDownload
                  disabled={!hasSeqData}
                  type="button"
                  color="primary"
                  title={hasSeqData ? 'Accept sequence data' : 'Please provide content before analysis is possible'}
                >
                  {t('OK')}
                </ButtonDownload>
              </ButtonContainer>
            </ColFlexHorizontal>
          </Row>
        </ColFlexVertical>
      </RowFill>
    </Form>
  )
}
