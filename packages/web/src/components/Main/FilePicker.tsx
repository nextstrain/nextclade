import React, { ReactNode } from 'react'

import { useTranslation } from 'react-i18next'
import { BsClipboard, BsFileEarmark, BsLink45Deg } from 'react-icons/all'
import { Tab, TabList, TabPanel, Tabs } from 'src/components/Common/Tabs'

import styled from 'styled-components'
import { Button, Input } from 'reactstrap'

import { CardL1, CardL1Body } from 'src/components/Common/Card'
import { UploaderGeneric } from 'src/components/Main/UploaderGeneric'

export const HeaderContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`

export const FileIconsContainer = styled.span`
  display: flex;
  width: 1.25rem;
`

export const TextContainer = styled.span`
  position: relative;
  margin-left: 1rem;
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
    <CardL1>
      <CardL1Body>
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
            <span>
              <label htmlFor="tree-url-text-input">
                <Input id="tree-url-text-input" />
                <Button color="primary">{t('Download')}</Button>
              </label>
            </span>
          </TabPanel>

          <TabPanel>
            <Input
              className="sequence-input"
              type="textarea"
              data-gramm_editor="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-gramm="false"
              wrap="off"
              name="sequence-input"
              id="sequence-input"
              cols={80}
              rows={20}
              value={value}
              onChange={onChange}
              innerRef={inputRef}
            />
          </TabPanel>
        </Tabs>
      </CardL1Body>
    </CardL1>
  )
}
