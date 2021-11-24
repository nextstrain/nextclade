import React, { HTMLProps, ReactNode, Ref, useCallback, useMemo, useState } from 'react'

import type { StrictOmit } from 'ts-essentials'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { AlgorithmInputFile, AlgorithmInputString, AlgorithmInputUrl } from 'src/io/AlgorithmInput'
import { TabsContent, TabsPanel } from 'src/components/Common/Tabs'
import { UploadBox } from './UploadBox'
import { UploadBoxCompact } from './UploadBoxCompact'
import { TabPanelUrl } from './TabPanelUrl'
import { TabPanelPaste } from './TabPanelPaste'
import { UploadedFileInfo } from './UploadedFileInfo'
import { UploadedFileInfoCompact } from './UploadedFileInfoCompact'

export const FilePickerContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin: 10px;
`

export const FilePickerHeader = styled.div`
  display: flex;
  margin-bottom: 0.5rem;
`

export const FilePickerTitle = styled.h4`
  flex: 1;
  padding-top: 0.75rem;
  margin: auto 0;
`

export const TabsPanelStyled = styled(TabsPanel)``

const TabsContentStyled = styled(TabsContent)<{ $compact?: boolean }>`
  min-height: ${(props) => !props.$compact && '200px'};
  height: 100%;
`

export interface FilePickerProps extends StrictOmit<HTMLProps<HTMLDivElement>, 'onInput' | 'onError' | 'as' | 'ref'> {
  compact?: boolean
  title: string
  icon: ReactNode
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
  compact,
  title,
  icon,
  exampleUrl,
  pasteInstructions,
  input,
  errors,
  onInput,
  onRemove,
  onError,
  inputRef,
  ...props
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
        body: compact ? (
          <UploadBoxCompact onUpload={onFile}>{icon}</UploadBoxCompact>
        ) : (
          <UploadBox onUpload={onFile}>{icon}</UploadBox>
        ),
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
    [compact, exampleUrl, icon, inputRef, onFile, onPaste, onUrl, pasteInstructions, t],
  )

  const FileUploadOrFileInfo = useMemo(() => {
    if (input) {
      return compact ? (
        <UploadedFileInfoCompact description={input.description} errors={errors} onRemove={clearAndRemove}>
          {icon}
        </UploadedFileInfoCompact>
      ) : (
        <UploadedFileInfo description={input.description} errors={errors} onRemove={clearAndRemove} />
      )
    }
    return <TabsContentStyled tabs={tabs} activeTab={activeTab} $compact={compact} />
  }, [activeTab, clearAndRemove, compact, errors, icon, input, tabs])

  return (
    <FilePickerContainer {...props}>
      <FilePickerHeader>
        <FilePickerTitle>{title}</FilePickerTitle>
        <TabsPanelStyled tabs={tabs} activeTab={activeTab} onChange={setActiveTab} disabled={!!input} />
      </FilePickerHeader>
      {FileUploadOrFileInfo}
    </FilePickerContainer>
  )
}
