import React, { Ref, useState } from 'react'

import { Col } from 'reactstrap'
// eslint-disable-next-line import/no-cycle
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
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface TabPanelPasteProps {
  pasteInstructions: string

  inputRef?: Ref<HTMLInputElement | null>

  onConfirm(seqData: string): void
}

export function TabPanelPaste({ onConfirm, pasteInstructions, inputRef }: TabPanelPasteProps) {
  const { t } = useTranslationSafe()
  const [seqData, setSeqData] = useState<string>('')
  const hasSeqData = seqData.length > 0
  const change = (e: React.ChangeEvent<HTMLInputElement>) => setSeqData(e.target.value)
  const clear = () => setSeqData('')
  const confirm = () => onConfirm(seqData)

  return (
    <Form>
      <RowFill noGutter>
        <ColFlexVertical>
          <Row noGutter>
            <Col className="d-flex">
              <Label className="mr-auto" htmlFor="sequence-input">
                {pasteInstructions}
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
                wrap="hard"
                data-gramm_editor="false"
                value={seqData}
                onChange={change}
                innerRef={inputRef}
              />
            </Col>
          </RowFill>

          <Row noGutter>
            <ColFlexHorizontal>
              <ButtonContainer>
                <ButtonClear
                  disabled={!hasSeqData}
                  type="button"
                  color="secondary"
                  title={t('Clear the text field')}
                  onClick={clear}
                >
                  {t('Clear')}
                </ButtonClear>

                <ButtonDownload
                  disabled={!hasSeqData}
                  type="button"
                  color="primary"
                  title={hasSeqData ? t('Accept the data') : t('Please provide the data first')}
                  onClick={confirm}
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
