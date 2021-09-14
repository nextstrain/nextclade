import React, { ReactNode, Ref, useCallback, useMemo, useState } from 'react'

import styled from 'styled-components'
import { Col, Row } from 'reactstrap'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { AlgorithmInputFile, AlgorithmInputString, AlgorithmInputUrl } from 'src/io/AlgorithmInput'
import { TabsContent, TabsPanel } from 'src/components/Common/Tabs'
import { UploaderGeneric } from './UploaderGeneric'
import { TabPanelUrl } from './TabPanelUrl'
import { TabPanelPaste } from './TabPanelPaste'
import { UploadedFileInfo } from './UploadedFileInfo'

export const FilePickerContainer = styled.section`
  display: flex;
  flex-direction: column;
`

export const FilePickerHeader = styled.header`
  display: flex;
  margin-bottom: 0.5rem;
`

export const FilePickerTitle = styled.h3`
  flex: 1;
  margin-bottom: 0;
`

export const TabsPanelStyled = styled(TabsPanel)``

export interface FilePickerProps {
  icon: ReactNode
  text: ReactNode
  exampleUrl: string
  pasteInstructions: string
  input?: AlgorithmInput
  errors: Error[]
  inputRef?: Ref<HTMLInputElement | null>
  onInput(input: AlgorithmInput): void
  onRemove(_0: unknown): void
  onError?(error: string): void
}

export function FilePicker({
  icon,
  text,
  exampleUrl,
  pasteInstructions,
  input,
  errors,
  onInput,
  onRemove,
  onError,
  inputRef,
}: FilePickerProps) {
  const { t } = useTranslationSafe()
  const [activeTab, setActiveTab] = useState<string>('file')

  const onFile = useCallback(
    (file: File) => {
      onInput(new AlgorithmInputFile(file))
    },
    [onInput],
  )

  const onUrl = useCallback(
    (url: string) => {
      onInput(new AlgorithmInputUrl(url))
    },
    [onInput],
  )

  const onPaste = useCallback(
    (content: string) => {
      onInput(new AlgorithmInputString(content))
    },
    [onInput],
  )

  const clearAndRemove = useCallback(() => {
    onRemove([])
  }, [onRemove])

  const tabs = useMemo(
    () => [
      {
        name: 'file',
        title: t('File'),
        body: <UploaderGeneric onUpload={onFile}>{icon}</UploaderGeneric>,
      },
      {
        name: 'link',
        title: t('Link'),
        body: <TabPanelUrl onConfirm={onUrl} exampleUrl={exampleUrl} />,
      },
      {
        name: 'text',
        title: t('Text'),
        body: <TabPanelPaste onConfirm={onPaste} pasteInstructions={pasteInstructions} inputRef={inputRef} />,
      },
    ],
    [exampleUrl, icon, inputRef, onFile, onPaste, onUrl, pasteInstructions, t],
  )

  if (input) {
    return (
      <Row noGutters>
        <Col>
          <UploadedFileInfo name={text} description={input.description} errors={errors} onRemove={clearAndRemove} />
        </Col>
      </Row>
    )
  }

  return (
    <FilePickerContainer>
      <FilePickerHeader>
        <FilePickerTitle>{t('Provide sequences')}</FilePickerTitle>
        <TabsPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </FilePickerHeader>

      <TabsContent tabs={tabs} activeTab={activeTab} />
    </FilePickerContainer>
  )
}
