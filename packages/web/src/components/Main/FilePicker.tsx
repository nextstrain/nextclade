import React, { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
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

import {
  Tab as TabBase,
  TabList as TabListBase,
  TabPanel as TabPanelBase,
  Tabs as TabsBase,
} from 'src/components/Common/Tabs'
import { UploaderGeneric } from 'src/components/Main/UploaderGeneric'

export const Tabs = styled(TabsBase)`
  border-image: none;
  border-radius: 3px;
  margin: 10px 5px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
`

export const TabList = styled(TabListBase)`
  border: none;
  border-image: none;
  border-image-width: 0;
  height: 42px;
  background-color: #666;
  color: #ddd;
  font-size: 1.25rem;
  padding: 3px 5px;
  padding-bottom: 0;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  margin-bottom: 0;
  display: flex;
`

export const Tab = styled(TabBase)`
  background: #666;
  color: #ccc;
  border-color: #999;
  font-size: 0.9rem;
  width: 125px;

  margin: 1px 1px;
  padding: 8px;

  &.react-tabs__tab--selected {
    border: none;
    border-image: none;
    font-weight: bold;
  }

  :hover {
    background: #777;
    color: #eee;
  }

  &.react-tabs__tab--selected:hover {
    background: #fff;
    color: #333;
    font-weight: bold;
  }
`

export const TabPanel = styled(TabPanelBase)`
  border: none;
  border-image: none;
  border-image-width: 0;
  margin: 3px 2px;
  padding: 6px;
  height: 200px;
`

export const FileIconsContainer = styled.span`
  display: flex;
  width: 1.2rem;
`

export const TextContainer = styled.span`
  position: relative;
  padding: 4px 7px;
  margin-right: auto;
  font-weight: bold;
  font-size: 1.25rem;
`

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

export function FilePicker({ icon, text, onUpload }: FilePickerProps) {
  const { t } = useTranslation()

  const value = undefined
  const onChange = undefined
  const inputRef = undefined

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
            <UploaderGeneric onUpload={onUpload}>
              <FileIconsContainer>{icon}</FileIconsContainer>
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
