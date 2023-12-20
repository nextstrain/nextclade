import React, { Ref, useCallback, useState } from 'react'

import { Button, Col, Label, Row } from 'reactstrap'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ButtonContainer, Form as FormBase } from './FilePickerStyles'
import { TextInputMonospace } from './TextInputMonospace'

const ButtonStyled = styled(Button)`
  width: 100px;
`

const Form = styled(FormBase)`
  display: flex;
  flex-direction: column;
  height: 100%;
`

export interface TabPanelPasteProps {
  instructions: string

  inputRef?: Ref<HTMLInputElement | null>

  onConfirm(seqData: string): void
}

export function TabPanelPaste({ onConfirm, instructions, inputRef }: TabPanelPasteProps) {
  const { t } = useTranslationSafe()
  const [seqData, setSeqData] = useState<string>('')
  const hasSeqData = seqData.length > 0

  const change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSeqData(e.target.value)
  }, [])

  const clear = useCallback(() => {
    setSeqData('')
  }, [])

  const confirm = useCallback(() => {
    onConfirm(seqData)
    clear()
  }, [onConfirm, seqData, clear])

  return (
    <Form>
      <Row noGutters className="w-100 h-100">
        <Col className="w-100 h-100 d-flex flex-column">
          <Label className="w-100 h-100 d-flex flex-column flex-1">
            <span className="w-100 flex-grow-0">{instructions}</span>
            <TextInputMonospace
              className="w-100 flex-grow-1"
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
          </Label>

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
        </Col>
      </Row>
    </Form>
  )
}
