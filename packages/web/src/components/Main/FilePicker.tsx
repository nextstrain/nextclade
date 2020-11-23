import React, { ReactNode, useState } from 'react'

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
  RowProps,
} from 'reactstrap'
import { BsClipboard, BsFileEarmark, BsLink45Deg } from 'react-icons/bs'
import { IoIosArrowDroprightCircle } from 'react-icons/io'
import { FaAsterisk } from 'react-icons/fa'

import type { FileStats } from 'src/state/algorithm/algorithm.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { Tab, TabList, TabPanel, Tabs, TextContainer } from 'src/components/Main/FilePickerTabs'
import { UploadedFileInfo } from 'src/components/Main/UploadedFileInfo'
import { UploaderGeneric } from 'src/components/Main/UploaderGeneric'
import { TabPanelPaste } from 'src/components/Main/TabPanelPaste'
import { TabPanelUrl } from 'src/components/Main//TabPanelUrl'

export const Row = styled(ReactstrapRow).withConfig({
  shouldForwardProp: (prop: string | number) => !['noGutter'].includes(prop),
})`
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
  //height: 100% !important;
  //width: 100%;
`

export const TextInputMonospace = styled(Input)`
  font-family: ${(props) => props.theme.font.monospace};
  font-size: 0.75rem;
  border-radius: 3px;
  box-shadow: inset 2px 1px 3px #2222;
  resize: none;
  //flex: 1;
  //height: 90px !important;
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

export const FlexRow = styled.div`
  //display: flex;
  //flex-direction: row;
  //flex: 1;
`

export const FlexColumn = styled.div`
  //display: flex;
  //flex-direction: column;
  //width: 100%;
  //flex: 1;
`

export const FlexBottom = styled(FlexColumn)`
  //margin-top: auto;
`

export const FlexRight = styled.div`
  //align-content: flex-start;
`

export const FlexFill = styled.div`
  //display: flex;
  //flex-direction: column;
  //flex: 1;
`

export const RowFill = styled(Row).withConfig({
  shouldForwardProp: (prop: string | number) => !['noGutter'].includes(prop),
})`
  flex: 1;

  //& > .col {
  //  display: flex;
  //  flex: 1 0 100%;
  //}
  //
  //& textarea {
  //  flex: 1 0 100%;
  //}
`

export const ColFlexVertical = styled(Col)`
  display: flex;
  flex-direction: column;
`

export const ColFlexHorizontal = styled(Col)`
  display: flex;
  flex-direction: row;
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
  canCollapse?: boolean
  defaultCollapsed?: boolean

  onUpload(file: File): void
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

  const url = ''

  function onUrlChange(seqData: string) {}

  const seqData = ''

  function onSeqDataChange(seqData: string) {}

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
          <TabList $canCollapse={canCollapse}>
            <TextContainer onClick={toggle}>
              <FlexRight>
                <h1>
                  {canCollapse ? (
                    <CollapseToggleIcon
                      title={shouldCollapse ? t('Expand this section') : t('Collapse this section')}
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
              </FlexRight>
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
              <TabPanelUrl url={url} onUrlChange={onUrlChange} />
            </TabPanel>

            <TabPanel>
              <TabPanelPaste seqData={seqData} onSeqDataChange={onSeqDataChange} />
            </TabPanel>
          </Collapse>
        </Tabs>
      </Col>
    </Row>
  )
}
