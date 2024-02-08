import React, { FC, ReactNode, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { Button as ButtonBase, Row, Col, Spinner as SpinnerBase } from 'reactstrap'
import { MdFileDownload, MdCheck } from 'react-icons/md'
import { UlGeneric } from 'src/components/Common/List'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import {
  FileIconCsv,
  FileIconFasta,
  FileIconJson,
  FileIconNdjson,
  FileIconNwk,
  FileIconTsv,
  FileIconZip,
} from 'src/components/Common/FileIcons'
import {
  DEFAULT_EXPORT_PARAMS,
  useExportCsv,
  useExportFasta,
  useExportJson,
  useExportNdjson,
  useExportPeptides,
  useExportTree,
  useExportTreeNwk,
  useExportTsv,
  useExportZip,
} from 'src/hooks/useExportResults'
import { LinkExternal } from 'src/components/Link/LinkExternal'

export function ExportTabMain({ setActiveTabId }: { setActiveTabId(id: string): void }) {
  const { t } = useTranslationSafe()

  const onClick = useCallback(() => {
    setActiveTabId('column-config')
  }, [setActiveTabId])

  const ColumnConfigLink = useMemo(
    () => (
      <Row noGutters>
        <Col>
          <ConfigButton color="link" onClick={onClick}>
            {t('Configure columns')}
          </ConfigButton>
        </Col>
      </Row>
    ),
    [onClick, t],
  )

  // TODO: We could probably use a map and then iterate over it, to reduce duplication
  const { isRunning: isRunningZip, isDone: isDoneZip, fn: exportZip } = useExportZip()
  const { isRunning: isRunningFasta, isDone: isDoneFasta, fn: exportFasta } = useExportFasta()
  const { isRunning: isRunningCsv, isDone: isDoneCsv, fn: exportCsv } = useExportCsv()
  const { isRunning: isRunningTsv, isDone: isDoneTsv, fn: exportTsv } = useExportTsv()
  const { isRunning: isRunningJson, isDone: isDoneJson, fn: exportJson } = useExportJson()
  const { isRunning: isRunningNdjson, isDone: isDoneNdjson, fn: exportNdjson } = useExportNdjson()

  const exportPeptides = useExportPeptides()
  const exportTree = useExportTree()
  const exportTreeNwk = useExportTreeNwk()

  const exportParams = useMemo(() => DEFAULT_EXPORT_PARAMS, [])

  return (
    <Ul>
      <ExportFileElement
        Icon={FileIconJson}
        filename={exportParams.filenameJson}
        HelpMain={t('Results of the analysis in {{formatName}} format.', { formatName: 'JSON' })}
        HelpDetails={t(
          'Contains detailed results of the analysis, such as clades, mutations, QC metrics etc., in {{formatName}} format. Convenient for further automated processing. Note that this format is unstable and can change without notice.',
          { formatName: 'JSON' },
        )}
        HelpDownload={t('Download results of the analysis in {{formatName}} format.', { formatName: 'JSON' })}
        onDownload={exportJson}
        isRunning={isRunningJson}
        isDone={isDoneJson}
      />

      <ExportFileElement
        Icon={FileIconNdjson}
        filename={exportParams.filenameNdjson}
        HelpMain={t('Results of the analysis in {{formatName}} format.', { formatName: 'NDJSON' })}
        HelpDetails={t(
          'Contains detailed results of the analysis, such as clades, mutations, QC metrics etc., in {{formatName}} format (newline-delimited JSON). Convenient for further automated processing. Note that this format is unstable and can change without notice.',
          { formatName: 'NDJSON' },
        )}
        HelpDownload={t('Download results of the analysis in {{formatName}} format.', { formatName: 'NDJSON' })}
        onDownload={exportNdjson}
        isRunning={isRunningNdjson}
        isDone={isDoneNdjson}
      />

      <ExportFileElement
        Icon={FileIconCsv}
        filename={exportParams.filenameCsv}
        HelpMain={t('Summarized results of the analysis in {{formatName}} format.', { formatName: 'CSV' })}
        HelpDetails={t(
          'Contains summarized results of the analysis, such as clades, mutations, QC metrics etc., in tabular format. Convenient for further review and processing using spreadsheets or data-science tools.',
        )}
        HelpDownload={t('Download summarized results in {{formatName}} format.', { formatName: 'CSV' })}
        Config={ColumnConfigLink}
        onDownload={exportCsv}
        isRunning={isRunningCsv}
        isDone={isDoneCsv}
      />

      <ExportFileElement
        Icon={FileIconTsv}
        filename={exportParams.filenameTsv}
        HelpMain={t('Summarized results of the analysis in {{formatName}} format.', { formatName: 'TSV' })}
        HelpDetails={t(
          'Contains summarized results of the analysis, such as clades, mutations, QC metrics etc., in tabular format. Convenient for further review and processing using spreadsheets or data-science tools.',
        )}
        HelpDownload={t('Download summarized results in {{formatName}} format.', { formatName: 'TSV' })}
        Config={ColumnConfigLink}
        onDownload={exportTsv}
        isRunning={isRunningTsv}
        isDone={isDoneTsv}
      />

      {exportTree && (
        <ExportFileElement
          Icon={FileIconJson}
          filename={exportParams.filenameTree}
          HelpMain={t('Phylogenetic tree with sequences placed onto it, in {{formatName}} format.', {
            formatName: 'Auspice JSON v2',
          })}
          HelpDetails={
            <>
              {t('Can be viewed locally with Nextstrain Auspice or in ')}
              <LinkExternal url="https://auspice.us">{'auspice.us'}</LinkExternal>
              {'.'}
            </>
          }
          HelpDownload={t('Download phylogenetic tree with sequences placed onto it, in {{formatName}} format.', {
            formatName: 'Auspice JSON v2',
          })}
          onDownload={exportTree.fn}
          isRunning={exportTree.isRunning}
          isDone={exportTree.isDone}
        />
      )}

      {exportTreeNwk && (
        <ExportFileElement
          Icon={FileIconNwk}
          filename={exportParams.filenameTreeNwk}
          HelpMain={t('Phylogenetic tree with sequences placed onto it, in {{formatName}} format.', {
            formatName: 'Newick',
          })}
          HelpDetails={
            <>
              {t('Can be viewed in most tree viewers, including: ')}
              <LinkExternal url="https://icytree.org/">{'icytree.org'}</LinkExternal>
              {t(' or ')}
              <LinkExternal url="https://auspice.us">{'auspice.us'}</LinkExternal>
              {'.'}
            </>
          }
          HelpDownload={t('Download phylogenetic tree with sequences placed onto it, in {{formatName}} format.', {
            formatName: 'Newick',
          })}
          onDownload={exportTreeNwk.fn}
          isRunning={exportTreeNwk.isRunning}
          isDone={exportTreeNwk.isDone}
        />
      )}

      <ExportFileElement
        Icon={FileIconFasta}
        filename={exportParams.filenameFasta}
        HelpMain={t('Aligned sequences in {{formatName}} format.', { formatName: 'FASTA' })}
        HelpDetails={t('Contains aligned sequences in {{formatName}} format.', { formatName: 'FASTA' })}
        HelpDownload={t('Download aligned sequences in {{formatName}} format.', { formatName: 'FASTA' })}
        onDownload={exportFasta}
        isRunning={isRunningFasta}
        isDone={isDoneFasta}
      />

      {exportPeptides && (
        <ExportFileElement
          Icon={FileIconZip}
          filename={exportParams.filenamePeptidesZip}
          HelpMain={t('Aligned peptides in {{formatName}} format, zipped', { formatName: 'FASTA' })}
          HelpDetails={t(
            'Contains results of translation of your sequences. One {{formatName}} file per gene, all in a zip archive.',
            { formatName: 'FASTA' },
          )}
          HelpDownload={t(
            'Download aligned peptides in {{formatName}} format, one file per gene, all in a zip archive.',
            {
              formatName: 'FASTA',
            },
          )}
          onDownload={exportPeptides.fn}
          isRunning={exportPeptides.isRunning}
          isDone={exportPeptides.isDone}
        />
      )}

      <ExportFileElement
        Icon={FileIconZip}
        filename={exportParams.filenameZip}
        HelpMain={t('All files in a {{formatName}} archive.', { formatName: 'zip' })}
        HelpDetails={t('Contains all of the above files in a single {{formatName}} file.', { formatName: 'zip' })}
        HelpDownload={t('Download all in {{formatName}} archive.', { formatName: 'zip' })}
        onDownload={exportZip}
        isRunning={isRunningZip}
        isDone={isDoneZip}
      />
    </Ul>
  )
}

export interface ExportFileElementProps {
  Icon: FC
  filename: string
  HelpMain: ReactNode
  HelpDetails: ReactNode
  HelpDownload: string
  Config?: ReactNode
  onDownload(filename: string): void
  isRunning?: boolean
  isDone?: boolean
}

export function ExportFileElement({
  Icon,
  filename,
  HelpMain,
  HelpDetails,
  HelpDownload,
  Config,
  onDownload,
  isRunning,
  isDone,
}: ExportFileElementProps) {
  const handleDownload = useCallback(() => onDownload(filename), [filename, onDownload])
  const hasFilename = filename.length > 0

  const icon = useMemo(() => {
    if (isRunning) {
      return <Spinner size="10px" />
    }
    if (isDone) {
      return <SuccessIcon />
    }
    return <DownloadIcon />
  }, [isDone, isRunning])

  return (
    <Li className="d-flex">
      <span className="flex-grow-0">
        <Icon />
      </span>
      <div className="mx-3 d-inline-block flex-grow-1">
        <pre className="mb-0 export-file-filename">{filename}</pre>
        <p className="my-0 small">{HelpMain}</p>
        <p className="my-0 small">{HelpDetails}</p>
        {Config}
      </div>

      <div className="d-inline-block ml-auto my-auto">
        <DownloadButton
          color="primary"
          disabled={isRunning || !hasFilename}
          title={HelpDownload}
          onClick={handleDownload}
        >
          {icon}
        </DownloadButton>
      </div>
    </Li>
  )
}

const DownloadButton = styled(ButtonBase)`
  width: 70px;
  height: 50px;
`

const ConfigButton = styled(ButtonBase)`
  height: 2rem;
  padding: 0;
`

const Spinner = styled(SpinnerBase)`
  width: 25px;
  height: 25px;
  margin: auto;
`

const DownloadIcon = styled(MdFileDownload)`
  width: 25px;
  height: 25px;
  margin-left: -1px;
  display: inline;
`

const SuccessIcon = styled(MdCheck)`
  width: 25px;
  height: 25px;
  margin-left: -1px;
  display: inline;
  color: #aaff99;
`

export const Ul = styled(UlGeneric)`
  flex: 1;
  overflow: auto;
`

export const Li = styled.li`
  margin: 10px 7px;
  display: flex;
  padding: 0.5rem 1rem;
  box-shadow: 0 0 12px 0 #0004;
  border: 1px #ccc9 solid;
  border-radius: 5px;
`
