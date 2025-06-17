import React, { Ref, useCallback, useMemo, useState } from 'react'

import { Button, Col, Label, Row } from 'reactstrap'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { ButtonContainer, Footnote, Form as FormBase } from './FilePickerStyles'
import { TextInputMonospace } from './TextInputMonospace'

const ButtonStyled = styled(Button)`
  width: 100px;
`

const Form = styled(FormBase)`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 5px;
  margin: 0;
`

export interface TabPanelUrlProps {
  exampleUrl: string

  inputRef?: Ref<HTMLInputElement | null>

  onConfirm(url: string): void
}

export function TabPanelUrl({ exampleUrl, onConfirm, inputRef }: TabPanelUrlProps) {
  const { t } = useTranslationSafe()
  const [url, setUrl] = useState<string>('')
  const hasUrl = url.length > 0
  const change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
  }, [])
  const clear = useCallback(() => {
    setUrl('')
  }, [])
  const confirm = useCallback(() => {
    onConfirm(url)
    clear()
  }, [onConfirm, url, clear])
  const placeholder = useMemo(() => t('For example: {{exampleUrl}}', { exampleUrl }), [t, exampleUrl])
  const instructions = t('Enter URL to a file to fetch')

  return (
    <Form>
      <Row className="w-100 h-100">
        <Col className="w-100 h-100 d-flex flex-column">
          <Label className="w-100 h-100 d-flex flex-column flex-1">
            <span className="w-100 flex-grow-0">{instructions}</span>
            <TextInputMonospace
              className="w-100 flex-grow-1"
              type="textarea"
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-gramm="false"
              wrap="hard"
              data-gramm_editor="false"
              value={url}
              onChange={change}
              innerRef={inputRef}
            />
          </Label>

          <Footnote>{t('*Make sure this file is publicly accessible and CORS is enabled on your server')}</Footnote>

          <ButtonContainer>
            <Button
              className="mr-auto"
              disabled={!hasUrl}
              type="button"
              color="link"
              title={t('Clear the URL text field')}
              onClick={clear}
            >
              {t('Clear')}
            </Button>

            <ButtonStyled
              className="ml-auto"
              disabled={!hasUrl}
              type="button"
              color="primary"
              title={hasUrl ? 'Start downloading this file' : 'Provide a URL before downloading is possible'}
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
