import React, { FC, ReactNode, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { Button } from 'reactstrap'
import { MdFileDownload } from 'react-icons/md'
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
      <Button color="link" className="p-0" onClick={onClick}>
        {t('Configure columns')}
      </Button>
    ),
    [onClick, t],
  )

  // TODO: We could probably use a map and then iterate over it, to reduce duplication
  const exportZip = useExportZip()
  const exportFasta = useExportFasta()
  const exportCsv = useExportCsv()
  const exportTsv = useExportTsv()
  const exportJson = useExportJson()
  const exportNdjson = useExportNdjson()
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
      />

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
        onDownload={exportTree}
      />

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
        onDownload={exportTreeNwk}
      />

      <ExportFileElement
        Icon={FileIconFasta}
        filename={exportParams.filenameFasta}
        HelpMain={t('Aligned sequences in {{formatName}} format.', { formatName: 'FASTA' })}
        HelpDetails={t('Contains aligned sequences in {{formatName}} format.', { formatName: 'FASTA' })}
        HelpDownload={t('Download aligned sequences in {{formatName}} format.', { formatName: 'FASTA' })}
        onDownload={exportFasta}
      />

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
        onDownload={exportPeptides}
      />

      <ExportFileElement
        Icon={FileIconZip}
        filename={exportParams.filenameZip}
        HelpMain={t('All files in a {{formatName}} archive.', { formatName: 'zip' })}
        HelpDetails={t('Contains all of the above files in a single {{formatName}} file.', { formatName: 'zip' })}
        HelpDownload={t('Download all in {{formatName}} archive.', { formatName: 'zip' })}
        onDownload={exportZip}
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
}

export function ExportFileElement({
  Icon,
  filename,
  HelpMain,
  HelpDetails,
  HelpDownload,
  Config,
  onDownload,
}: ExportFileElementProps) {
  const handleDownload = useCallback(() => onDownload(filename), [filename, onDownload])
  const hasFilename = filename.length > 0

  return (
    <Li className="d-flex">
      <span className="flex-grow-0">
        <Icon />
      </span>
      <div className="mx-3 d-inline-block flex-grow-1">
        <pre className="mb-0 export-file-filename">{filename}</pre>
        <p className="my-0 small">{HelpMain}</p>
        <p className="my-0 small">{HelpDetails}</p>
        {Config && <p className="my-0">{Config}</p>}
      </div>

      <div className="d-inline-block ml-auto my-auto">
        <Button color="primary" disabled={!hasFilename} title={HelpDownload} onClick={handleDownload}>
          <DownloadIcon />
        </Button>
      </div>
    </Li>
  )
}

const DownloadIcon = styled(MdFileDownload)`
  width: 25px;
  height: 25px;
  margin-left: -1px;
  display: inline;
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
