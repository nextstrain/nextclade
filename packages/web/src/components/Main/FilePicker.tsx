import React, { ReactNode, useState } from 'react'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { UploadedFileInfo } from 'src/components/Main/UploadedFileInfo'
import { FileStats } from 'src/state/algorithm/algorithm.state'
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

import { UploaderGeneric } from 'src/components/Main/UploaderGeneric'
import { Tab, TabList, TabPanel, Tabs, TextContainer } from 'src/components/Main/FilePickerTabs'

export const Row = styled(ReactstrapRow)`
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

export const TextInputMonospace = styled(Input)`
  width: 100%;
  font-family: ${(props) => props.theme.font.monospace};
  font-size: 0.75rem;
  border-radius: 3px;
  box-shadow: inset 2px 1px 3px #2222;
  resize: none;
`

export const Form = styled(ReactstrapForm)`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 5px;
`

export const Label = styled(ReactstrapLabel)`
  margin-right: auto;
  margin-left: 4px;
  margin-bottom: 2px;
`

export const FormGroup = styled(ReactstrapFormGroup)`
  margin-bottom: 10px;
`

export const Flex = styled.div`
  display: flex;
  width: 100%;
`

export const Footnote = styled.small`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${(props) => props.theme.gray600};
`

export const ButtonClear = styled(Button)`
  min-width: 100px;
  margin-right: auto;
`

export const ButtonDownload = styled(Button)`
  min-width: 150px;
  margin-left: auto;
`

export const FlexBottom = styled(Flex)`
  margin-top: 25px;
`

export const CollapseToggleIcon = styled(IoIosArrowDroprightCircle)<{ shouldRotate: boolean; canCollapse: boolean }>`
  transition: transform linear 0.25s;
  ${({ shouldRotate }) => shouldRotate && 'transform: rotate(90deg)'};
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
  canCollapse?: boolean
  defaultCollapsed?: boolean

  onUpload(): void
}

const MOCK_ERRORS = ['File format not recognized', 'Unable to download']

export function FilePicker({ icon, text, canCollapse = true, defaultCollapsed = true }: FilePickerProps) {
  const { t } = useTranslationSafe()
  const [file, setFile] = useState<FileStats | undefined>(undefined)
  const [errors, setErrors] = useState<string[]>(MOCK_ERRORS)
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

  const url: string | undefined = ''
  const hasUrl = url?.length && url?.length > 0
  const onUrlChange = undefined
  const urlInputRef = undefined

  const seqData: string | undefined = ''
  const hasSeqData = seqData?.length && seqData?.length > 0
  const onSeqDataChange = undefined
  const seqInputRef = undefined

  function onUpload(file: File) {
    setFile({ name: file.name, size: file.size })
  }

  function onRemove() {
    setFile(undefined)
  }

  if (file) {
    return (
      <Row noGutters>
        <Col>
          <UploadedFileInfo text={text} file={file} errors={errors} onRemove={onRemove} />
        </Col>
      </Row>
    )
  }

  return (
    <Row noGutters>
      <Col>
        <Tabs className="file-picker-tabs">
          <TabList canCollapse={canCollapse}>
            <TextContainer onClick={toggle}>
              <div className="align-content-start">
                <h1>
                  {canCollapse ? (
                    <CollapseToggleIcon
                      title={shouldCollapse ? t('Expand this section') : t('Collapse this section')}
                      canCollapse={canCollapse}
                      shouldRotate={!shouldCollapse}
                      color="#ccc"
                      size={30}
                    />
                  ) : (
                    <NonCollapsibleIcon title={t('Required')} color="#ccc" size={24} />
                  )}

                  {text}
                </h1>
              </div>
            </TextContainer>

            <Tab onClick={open} title={t('Provide file from your computer')}>
              <span className="mr-2">
                <BsFileEarmark />
              </span>
              {t('From file')}
            </Tab>
            <Tab onClick={open} title={t('Provide URL to download a file from a remote server')}>
              <span className="mr-2">
                <BsLink45Deg />
              </span>
              {t('From URL')}
            </Tab>
            <Tab onClick={open} title={t('Type or paste the content directly')}>
              <span className="mr-2">
                <BsClipboard />
              </span>
              {t('Paste')}
            </Tab>
          </TabList>

          <Collapse isOpen={!shouldCollapse}>
            <TabPanel>
              <UploaderGeneric fileStats={file} removeFile={onRemove} onUpload={onUpload}>
                {icon}
              </UploaderGeneric>
            </TabPanel>

            <TabPanel>
              <Form>
                <FormGroup>
                  <Flex>
                    <Label htmlFor="tree-url-text-input">{t('Enter URL to a file to fetch')}</Label>
                  </Flex>
                  <TextInputMonospace
                    id="tree-url-text-input"
                    type="textarea"
                    placeholder={t('For example: {{exampleUrl}}', { exampleUrl: 'https://example.com/data.fasta' })}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-gramm="false"
                    wrap="off"
                    data-gramm_editor="false"
                    value={url}
                    onChange={onUrlChange}
                    innerRef={urlInputRef}
                  />

                  <Flex>
                    <Footnote>
                      {t('*Make sure this file is publicly accessible and CORS is enabled on your server')}
                    </Footnote>
                  </Flex>

                  <FlexBottom>
                    <ButtonClear
                      disabled={!hasUrl}
                      type="button"
                      color="secondary"
                      title={t('Clear the URL text field')}
                    >
                      {t('Clear')}
                    </ButtonClear>

                    <ButtonDownload
                      disabled={!hasUrl}
                      type="button"
                      color="primary"
                      title={hasUrl ? 'Start downloading this file' : 'Provide a URL before downloading is possible'}
                    >
                      {t('Download')}
                    </ButtonDownload>
                  </FlexBottom>
                </FormGroup>
              </Form>
            </TabPanel>
            <TabPanel>
              <Form>
                <FormGroup>
                  <Flex>
                    <Label htmlFor="sequence-input">{t('Enter sequence data in FASTA format')}</Label>
                  </Flex>
                  <TextInputMonospace
                    id="sequence-input"
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
                    innerRef={seqInputRef}
                  />

                  <Flex>
                    <Footnote>
                      {t('*Make sure this file is publicly accessible and CORS is enabled on your server')}
                    </Footnote>
                  </Flex>

                  <FlexBottom>
                    <ButtonClear
                      disabled={!hasSeqData}
                      type="button"
                      color="secondary"
                      title={t('Clear the text field')}
                    >
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
                  </FlexBottom>
                </FormGroup>
              </Form>
            </TabPanel>
          </Collapse>
        </Tabs>
      </Col>
    </Row>
  )
}
