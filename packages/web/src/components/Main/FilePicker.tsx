import React, { ReactNode, Ref, useMemo, useState } from 'react'

import styled from 'styled-components'
import {
  Button,
  Col,
  Collapse,
  Form as ReactstrapForm,
  FormGroup as ReactstrapFormGroup,
  Input,
  Label as ReactstrapLabel,
  Row as ReactstrapRow,
} from 'reactstrap'
import { BsClipboard, BsFileEarmark, BsLink45Deg } from 'react-icons/bs'
import { IoIosArrowDroprightCircle } from 'react-icons/io'
import { FaAsterisk } from 'react-icons/fa'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Tab, TabList, TabPanel, Tabs, TextContainer } from 'src/components/Main/FilePickerTabs'
import { UploadedFileInfo } from 'src/components/Main/UploadedFileInfo'
import { UploaderGeneric } from 'src/components/Main/UploaderGeneric'
import { TabPanelPaste } from 'src/components/Main/TabPanelPaste' // eslint-disable-line import/no-cycle
import { TabPanelUrl } from 'src/components/Main//TabPanelUrl' // eslint-disable-line import/no-cycle

import type { AlgorithmInput } from 'src/state/algorithm/algorithm.state'
import { AlgorithmInputFile, AlgorithmInputString, AlgorithmInputUrl } from 'src/io/AlgorithmInput'
import { BadgeDefault, BadgeRequired } from 'src/components/Main/BadgeDefault'
import { filterProps } from 'src/helpers/filterProps'
import { TabContainer } from '../Common/Tabs'

export const Row = styled(ReactstrapRow).withConfig(filterProps(['noGutter']))`
  &:first-child > .col {
    margin-top: 0;
  }

  &:first-child > .col > .file-picker-tabs {
    margin-top: 0;
  }

  &:last-child > .col {
    margin-bottom: 0;
  }

  &:last-child > .col > .file-picker-tabs {
    margin-bottom: 0;
  }
`

export const TextInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`

export const TextInputMonospace = styled(Input)`
  font-family: ${(props) => props.theme.font.monospace};
  font-size: 0.75rem;
  border-radius: 3px;
  box-shadow: inset 2px 1px 3px #2222;
  resize: none;
  word-break: break-all;
  word-wrap: break-word;
  text-wrap: unrestricted;
`

export const Form = styled(ReactstrapForm)`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  margin: 0 5px;
`

export const FormGroup = styled(ReactstrapFormGroup)`
  display: flex;
  flex-direction: column;
  flex: 1;
  margin: 0 !important;
`

export const Label = styled(ReactstrapLabel)`
  margin-right: auto;
  margin-left: 4px;
  margin-bottom: 2px;
`

export const Footnote = styled.small`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${(props) => props.theme.gray600};
`

export const ButtonContainer = styled.div`
  display: flex;
  width: 100%;
  margin-top: 5px;
  margin-bottom: 3px;
`

export const ButtonClear = styled(Button)`
  min-width: 100px;
  margin-right: auto;
`

export const ButtonDownload = styled(Button)`
  min-width: 150px;
  margin-left: auto;
`

export const FlexRow = styled.div``

export const FlexColumn = styled.div``

export const FlexBottom = styled(FlexColumn)``

export const FlexRight = styled.div`
  margin-left: auto;
`

export const FlexLeft = styled.div`
  margin-right: auto;
`

export const FlexFill = styled.div``

export const RowFill = styled(Row).withConfig(filterProps(['noGutter']))`
  flex: 1;
`

export const ColFlexVertical = styled(Col)`
  display: flex;
  flex-direction: column;
`

export const ColFlexHorizontal = styled(Col)`
  display: flex;
  flex-direction: row;
  width: 100%;
`

export const CollapseToggleIcon = styled(IoIosArrowDroprightCircle)<{ $shouldRotate: boolean; $canCollapse: boolean }>`
  transition: transform linear 0.25s;
  ${({ $shouldRotate }) => $shouldRotate && 'transform: rotate(90deg)'};
  margin: auto;
  margin-right: 0.5rem;
  margin-bottom: 5px;
  cursor: pointer;
`

export const NonCollapsibleIcon = styled(FaAsterisk)`
  margin: auto;
  margin-right: 0.5rem;
  margin-bottom: 5px;
`

export interface FilePickerProps {
  icon: ReactNode
  text: ReactNode
  exampleUrl: string
  pasteInstructions: string
  input?: AlgorithmInput
  errors: Error[]
  inputRef?: Ref<HTMLInputElement | null>
  canCollapse?: boolean
  defaultCollapsed?: boolean

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
  canCollapse = true,
  defaultCollapsed = true,
}: FilePickerProps) {
  const { t } = useTranslationSafe()

  const [shouldCollapse, setShouldCollapse] = useState(canCollapse ? defaultCollapsed : false)

  const toggle = (e: React.MouseEvent<HTMLElement>) => {
    if (canCollapse) {
      setShouldCollapse((shouldCollapse) => !shouldCollapse)
    }
  }

  const open = (e: React.MouseEvent<HTMLElement>) => {
    if (canCollapse) {
      setShouldCollapse(false)
    }
  }

  function onFile(file: File) {
    onInput(new AlgorithmInputFile(file))
  }

  function onUrl(url: string) {
    onInput(new AlgorithmInputUrl(url))
  }

  function onPaste(content: string) {
    onInput(new AlgorithmInputString(content))
  }

  function clearAndRemove() {
    onRemove([])
  }

  const collapseToggleIconTooltip = useMemo(
    () => (shouldCollapse ? t('Expand this section') : t('Collapse this section')),
    [shouldCollapse, t],
  )

  const badge = useMemo(() => (canCollapse ? <BadgeDefault /> : <BadgeRequired />), [canCollapse])

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
    <Row noGutters>
      <Col>
        <Tabs className="file-picker-tabs">
          <TabList $canCollapse={canCollapse}>
            <TextContainer onClick={toggle}>
              <FlexLeft>
                <h1>
                  {canCollapse ? (
                    <CollapseToggleIcon
                      title={collapseToggleIconTooltip}
                      $canCollapse={canCollapse}
                      $shouldRotate={!shouldCollapse}
                      color="#ccc"
                      size={30}
                    />
                  ) : (
                    <NonCollapsibleIcon title={t('Required')} color="#ccc" size={24} />
                  )}

                  {text}
                </h1>
              </FlexLeft>
              <FlexRight>{badge}</FlexRight>
            </TextContainer>

            <Tab onClick={open} title={t('Provide file from your computer')}>
              <TabContainer>
                <span className="mr-2">
                  <BsFileEarmark />
                </span>
                <span>{t('From file')}</span>
              </TabContainer>
            </Tab>
            <Tab onClick={open} title={t('Provide URL to download a file from a remote server')}>
              <TabContainer>
                <span className="mr-2">
                  <BsLink45Deg />
                </span>
                <span>{t('From URL')}</span>
              </TabContainer>
            </Tab>
            <Tab onClick={open} title={t('Type or paste the content directly')}>
              <TabContainer>
                <span className="mr-2">
                  <BsClipboard />
                </span>
                <span>{t('Paste')}</span>
              </TabContainer>
            </Tab>
          </TabList>

          <Collapse isOpen={!shouldCollapse}>
            <TabPanel>
              <UploaderGeneric onUpload={onFile}>{icon}</UploaderGeneric>
            </TabPanel>

            <TabPanel>
              <TabPanelUrl onConfirm={onUrl} exampleUrl={exampleUrl} />
            </TabPanel>

            <TabPanel>
              <TabPanelPaste onConfirm={onPaste} pasteInstructions={pasteInstructions} inputRef={inputRef} />
            </TabPanel>
          </Collapse>
        </Tabs>
      </Col>
    </Row>
  )
}
