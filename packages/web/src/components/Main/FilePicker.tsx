import React, { ReactNode, useState } from 'react'

import { useTranslation } from 'react-i18next'
import { UploadedFileInfo } from 'src/components/Main/UploadedFileInfo'
import { FileStats } from 'src/state/algorithm/algorithm.state'
import styled from 'styled-components'
import {
  Button,
  Input,
  Col,
  Row,
  Form as ReactstrapForm,
  Label as ReactstrapLabel,
  FormGroup as ReactstrapFormGroup,
} from 'reactstrap'
import { BsClipboard, BsFileEarmark, BsLink45Deg } from 'react-icons/bs'

import { UploaderGeneric } from 'src/components/Main/UploaderGeneric'
import { Tab, TabList, TabPanel, Tabs, TextContainer } from 'src/components/Main/FilePickerTabs'

export const TextInputMonospace = styled(Input)`
  width:100%;
  font-family: ${(props) => props.theme.font.monospace};
  font-size: 0.75rem;
  border-radius: 3px;
  box-shadow: inset 2px 1px 3px #2222;
  resize: none;
}
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

export interface FilePickerProps {
  icon: ReactNode
  text: ReactNode

  onUpload(): void
}

const MOCK_ERRORS = ['File format not recognized', 'Unable to download']

export function FilePicker({ icon, text /*, onUpload */ }: FilePickerProps) {
  const { t } = useTranslation()

  const value = undefined
  const onChange = undefined
  const inputRef = undefined

  const [file, setFile] = useState<FileStats | undefined>(undefined)
  const [errors, setErrors] = useState<string[]>(MOCK_ERRORS)

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
        <Tabs>
          <TabList>
            <TextContainer>{text}</TextContainer>

            <Tab>
              <span className="mr-2">
                <BsFileEarmark />
              </span>
              {t('From file')}
            </Tab>
            <Tab>
              <span className="mr-2">
                <BsLink45Deg />
              </span>
              {t('From URL')}
            </Tab>
            <Tab>
              <span className="mr-2">
                <BsClipboard />
              </span>
              {t('Paste')}
            </Tab>
          </TabList>

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
                  placeholder="https://example.com/data.fasta"
                  type="textarea"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-gramm="false"
                  wrap="off"
                  data-gramm_editor="false"
                  id="sequence-input"
                  cols={80}
                  value={value}
                  onChange={onChange}
                  innerRef={inputRef}
                />

                <Flex>
                  <Footnote>
                    {t('*Make sure this file is publicly accessible and CORS is enabled on your server')}
                  </Footnote>
                </Flex>

                <FlexBottom>
                  <ButtonClear type="button" color="secondary">
                    {t('Clear')}
                  </ButtonClear>

                  <ButtonDownload type="button" color="primary">
                    {t('Download')}
                  </ButtonDownload>
                </FlexBottom>
              </FormGroup>
            </Form>
          </TabPanel>
          <TabPanel>
            <TextInputMonospace
              type="textarea"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-gramm="false"
              wrap="off"
              data-gramm_editor="false"
              id="sequence-input"
              cols={80}
              value={value}
              onChange={onChange}
              innerRef={inputRef}
            />
          </TabPanel>
        </Tabs>
      </Col>
    </Row>
  )
}
