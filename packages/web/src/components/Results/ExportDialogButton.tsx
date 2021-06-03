import React, { useCallback, useState } from 'react'

import { connect } from 'react-redux'
import styled from 'styled-components'
import {
  Button,
  Card,
  Col,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader as ReactstrapModalHeader,
  Row,
} from 'reactstrap'
import { MdFileDownload } from 'react-icons/md'

import type { State } from 'src/state/reducer'
import type { ExportParams } from 'src/state/algorithm/algorithm.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { PanelButton } from 'src/components/Results/PanelButton'
import {
  exportAll,
  exportCsvTrigger,
  exportFastaTrigger,
  exportJsonTrigger,
  exportPeptides,
  exportTreeJsonTrigger,
  exportTsvTrigger,
} from 'src/state/algorithm/algorithm.actions'
import {
  FileIconCsv,
  FileIconTsv,
  FileIconFasta,
  FileIconJson,
  FileIconZip,
} from 'src/components/Main/UploaderFileIcons'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { selectExportParams } from 'src/state/algorithm/algorithm.selectors'

export const DownloadIcon = styled(MdFileDownload)`
  width: 25px;
  height: 25px;
  margin-left: -1px;
  display: inline;
`
export const ModalHeader = styled(ReactstrapModalHeader)`
  .modal-title {
    display: flex;
    width: 100%;
  }
`

export interface ExportElementProps {
  Icon: React.ReactNode
  filename: string
  HelpMain: React.ReactNode
  HelpDetails: React.ReactNode
  HelpDownload: string

  onDownload(filename: string): void
}

export function ExportFileElement({
  Icon,
  filename,
  HelpMain,
  HelpDetails,
  HelpDownload,
  onDownload,
}: ExportElementProps) {
  const handleDownload = useCallback(() => onDownload(filename), [filename, onDownload])
  const hasFilename = filename.length > 0

  return (
    <ListGroupItem className="d-flex">
      <span className="flex-grow-0">{Icon}</span>
      <div className="mx-3 d-inline-block flex-grow-1">
        <pre className="mb-0 export-file-filename">{filename}</pre>
        <p className="my-0 small">{HelpMain}</p>
        <p className="my-0 small">{HelpDetails}</p>
      </div>

      <div className="d-inline-block ml-auto my-auto">
        <Button color="primary" disabled={!hasFilename} title={HelpDownload} onClick={handleDownload}>
          <DownloadIcon />
        </Button>
      </div>
    </ListGroupItem>
  )
}

export interface ExportDialogButtonProps {
  exportAllTrigger: () => void
  exportCsvTrigger: (filename: string) => void
  exportFastaTrigger: (filename: string) => void
  exportJsonTrigger: (filename: string) => void
  exportPeptidesTrigger: (filename: string) => void
  exportTreeJsonTrigger: (filename: string) => void
  exportTsvTrigger: (filename: string) => void
  exportParams: ExportParams
}

const mapStateToProps = (state: State) => ({
  exportParams: selectExportParams(state),
})

const mapDispatchToProps = {
  exportAllTrigger: () => exportAll.trigger(),
  exportCsvTrigger: () => exportCsvTrigger(),
  exportFastaTrigger: () => exportFastaTrigger(),
  exportJsonTrigger: () => exportJsonTrigger(),
  exportPeptidesTrigger: () => exportPeptides.trigger(),
  exportTreeJsonTrigger: () => exportTreeJsonTrigger(),
  exportTsvTrigger: () => exportTsvTrigger(),
}

export function ExportDialogButtonDisconnected({
  exportAllTrigger,
  exportCsvTrigger,
  exportFastaTrigger,
  exportJsonTrigger,
  exportPeptidesTrigger,
  exportTreeJsonTrigger,
  exportTsvTrigger,
  exportParams,
}: ExportDialogButtonProps) {
  const { t } = useTranslationSafe()
  const [isOpen, setIsOpen] = useState<boolean>(false)

  function toggleOpen() {
    setIsOpen(!isOpen)
  }

  function open() {
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

  return (
    <>
      <PanelButton type="button" onClick={open} title={t('Download results')}>
        <DownloadIcon />
      </PanelButton>
      <Modal centered isOpen={isOpen} toggle={toggleOpen} fade={false} size="lg">
        <ModalHeader toggle={close} tag="div" className="d-flex">
          <h4 className="mx-auto">
            <DownloadIcon />
            {t('Download results')}
          </h4>
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col>
              <Card>
                <ListGroup flush>
                  <ExportFileElement
                    Icon={<FileIconJson />}
                    filename={exportParams.filenameJson}
                    HelpMain={t('Results of the analysis in JSON format.')}
                    HelpDetails={t(
                      'Contains detailed results of the analysis, such as clades, mutations, QC metrics etc., in JSON format. Convenient for further automated processing.',
                    )}
                    HelpDownload={t('Download results of the analysis in JSON format.')}
                    onDownload={exportJsonTrigger}
                  />

                  <ExportFileElement
                    Icon={<FileIconCsv />}
                    filename={exportParams.filenameCsv}
                    HelpMain={t('Summarized results of the analysis in CSV format.')}
                    HelpDetails={t(
                      'Contains summarized results of the analysis, such as clades, mutations, QC metrics etc., in tabular format. Convenient for further review and processing using spreadsheets or data-science tools.',
                    )}
                    HelpDownload={t('Download summarized results in CSV format')}
                    onDownload={exportCsvTrigger}
                  />

                  <ExportFileElement
                    Icon={<FileIconTsv />}
                    filename={exportParams.filenameTsv}
                    HelpMain={t('Summarized results of the analysis in TSV format.')}
                    HelpDetails={t(
                      'Contains summarized results of the analysis, such as clades, mutations, QC metrics etc in tabular format. Convenient for further review and processing using spreadsheets or data-science tools.',
                    )}
                    HelpDownload={t('Download summarized results in TSV format')}
                    onDownload={exportTsvTrigger}
                  />

                  <ExportFileElement
                    Icon={<FileIconJson />}
                    filename={exportParams.filenameTreeJson}
                    HelpMain={t('Phylogenetic tree with sequenced placed onto it.')}
                    HelpDetails={
                      <>
                        {t('The tree is in Nextstrain format.')}{' '}
                        {t('Can be viewed locally with Nextstrain Auspice or in {{auspice_us}}')}
                        <LinkExternal url="https://auspice.us">{'auspice.us'}</LinkExternal>
                        {'.'}
                      </>
                    }
                    HelpDownload={t(
                      'Download phylogenetic tree with sequenced placed onto it, in Auspice JSON v2 format.',
                    )}
                    onDownload={exportTreeJsonTrigger}
                  />

                  <ExportFileElement
                    Icon={<FileIconFasta />}
                    filename={exportParams.filenameFasta}
                    HelpMain={t('Aligned sequences in FASTA format.')}
                    HelpDetails={t('Contains aligned sequences in FASTA format.')}
                    HelpDownload={t('Download aligned sequences in FASTA format.')}
                    onDownload={exportFastaTrigger}
                  />

                  <ExportFileElement
                    Icon={<FileIconZip />}
                    filename={exportParams.filenamePeptidesZip}
                    HelpMain={t('Aligned peptides in FASTA format, zipped')}
                    HelpDetails={t(
                      'Contains results of translation of your sequences. One FASTA file per gene, all in a zip archive.',
                    )}
                    HelpDownload={t(
                      'Download aligned peptides in FASTA format, one file per gene, all in a zip archive.',
                    )}
                    onDownload={exportPeptidesTrigger}
                  />

                  <ExportFileElement
                    Icon={<FileIconZip />}
                    filename={exportParams.filenameZip}
                    HelpMain={t('All files in a zip archive.')}
                    HelpDetails={t('Contains all of the above files in a single zip file.')}
                    HelpDownload={t('Download all in zip archive')}
                    onDownload={exportAllTrigger}
                  />
                </ListGroup>
              </Card>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button type="button" onClick={close} title={t('Close')}>
            <div>{t('Close')}</div>
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export const ExportDialogButton = connect(mapStateToProps, mapDispatchToProps)(ExportDialogButtonDisconnected)
