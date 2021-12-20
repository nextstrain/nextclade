import React, { Ref, useState } from 'react'

import { Button, Col, Label, Row } from 'reactstrap'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ButtonContainer, ColFlexHorizontal, ColFlexVertical, Form, RowFill } from './FilePickerStyles'
import { TextInputMonospace } from './TextInputMonospace'

const ButtonStyled = styled(Button)`
  width: 100px;
`

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
      <RowFill noGutters>
        <ColFlexVertical>
          <Row noGutters>
            <Col className="d-flex">
              <Label className="mr-auto" htmlFor="sequence-input">
                {pasteInstructions}
              </Label>
            </Col>
          </Row>

          <RowFill noGutters>
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

          <Row noGutters>
            <ColFlexHorizontal>
              <ButtonContainer>
                <Button
                  className="mr-auto"
                  disabled={!hasSeqData}
                  type="button"
                  color="link"
                  title={t('Clear the text field')}
                  onClick={clear}
                >
                  {t('Clear')}
                </Button>

                <ButtonStyled
                  className="ml-auto"
                  disabled={!hasSeqData}
                  type="button"
                  color="primary"
                  title={hasSeqData ? t('Accept the data') : t('Please provide the data first')}
                  onClick={confirm}
                >
                  {t('OK')}
                </ButtonStyled>
              </ButtonContainer>
            </ColFlexHorizontal>
          </Row>
        </ColFlexVertical>
      </RowFill>
    </Form>
  )
}
