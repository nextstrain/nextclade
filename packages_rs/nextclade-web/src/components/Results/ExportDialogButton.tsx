import { get, mapValues } from 'lodash'
import React, { FC, ReactNode, useCallback, useMemo } from 'react'
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import {
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  ListGroup,
  ListGroupItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader as ReactstrapModalHeader,
  Row,
} from 'reactstrap'
import { MdFileDownload } from 'react-icons/md'

import { canDownloadAtom, csvColumnConfigAtom } from 'src/state/results.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { PanelButton } from 'src/components/Results/PanelButton'
import {
  FileIconCsv,
  FileIconFasta,
  FileIconJson,
  FileIconNdjson,
  FileIconTsv,
  FileIconZip,
} from 'src/components/Common/FileIcons'
import {
  DEFAULT_EXPORT_PARAMS,
  useExportCsv,
  useExportErrorsCsv,
  useExportFasta,
  useExportInsertionsCsv,
  useExportJson,
  useExportNdjson,
  useExportPeptides,
  useExportTree,
  useExportTsv,
  useExportZip,
} from 'src/hooks/useExportResults'
import { LinkExternal } from 'src/components/Link/LinkExternal'
import { useToggle } from 'src/hooks/useToggle'
import { CardCollapsible } from 'src/components/Common/CardCollapsible'
import { useStopPropagation } from 'src/hooks/useStopPropagation'
import { CheckboxIndeterminate, CheckboxState } from 'src/components/Common/Checkbox'
import { CsvColumnConfig } from 'src/types'
import copy from 'fast-copy'
import { rgba } from 'polished'

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
}: ExportElementProps) {
  const handleDownload = useCallback(() => onDownload(filename), [filename, onDownload])
  const hasFilename = filename.length > 0

  return (
    <ListGroupItem className="d-flex">
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
    </ListGroupItem>
  )
}

export interface ExportParams {
  filenameZip: string
  filenameCsv: string
  filenameTsv: string
  filenameJson: string
  filenameNdjson: string
  filenameTree: string
  filenameFasta: string
  filenamePeptidesZip: string
  filenameInsertionsCsv: string
  filenameErrorsCsv: string
  filenamePeptidesTemplate: string
}

export function ExportDialogButton() {
  const { t } = useTranslationSafe()
  const [isOpen, toggleOpen, open, close] = useToggle(false)
  const [isColumnConfigOpen, toggleColumnConfigOpen] = useToggle(false)
  const canDownload = useRecoilValue(canDownloadAtom)

  const exportParams = useMemo(() => DEFAULT_EXPORT_PARAMS, [])
  const exportCsv_ = useExportCsv() // eslint-disable-line no-underscore-dangle
  const exportTsv_ = useExportTsv() // eslint-disable-line no-underscore-dangle
  const exportCsv = useCallback(() => exportCsv_(exportParams.filenameCsv), [exportCsv_, exportParams.filenameCsv])
  const exportTsv = useCallback(() => exportTsv_(exportParams.filenameTsv), [exportParams.filenameTsv, exportTsv_])

  const title = useMemo(() => {
    return isColumnConfigOpen ? t('Configure columns for CSV and TSV files') : t('Download results')
  }, [isColumnConfigOpen, t])

  return (
    <>
      <PanelButton type="button" onClick={open} title={t('Download results')} disabled={!canDownload}>
        <DownloadIcon />
      </PanelButton>
      <Modal centered isOpen={isOpen} toggle={toggleOpen} fade={false} size="lg">
        <ModalHeader toggle={close} tag="div" className="d-flex">
          <h4 className="mx-auto">{title}</h4>
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col>
              {isColumnConfigOpen ? (
                <CsvColumnConfigDialog />
              ) : (
                <DownloadListDialog toggleColumnConfigOpen={toggleColumnConfigOpen} />
              )}
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter className="d-flex w-100">
          {isColumnConfigOpen && (
            <div className="mr-auto">
              <Button type="button" className="mx-1" onClick={toggleColumnConfigOpen} title={t('Back to Downloads')}>
                {t('Back to Downloads')}
              </Button>

              <Button type="button" color="success" className="mx-1" onClick={exportCsv} title={t('Download CSV')}>
                {t('Download CSV')}
              </Button>

              <Button type="button" color="primary" className="mx-1" onClick={exportTsv} title={t('Download TSV')}>
                {t('Download TSV')}
              </Button>
            </div>
          )}
          <Button type="button" className="ml-auto" onClick={close} title={t('Close')}>
            <div>{t('Close')}</div>
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export interface DownloadListDialogProps {
  toggleColumnConfigOpen: () => void
}

export function DownloadListDialog({ toggleColumnConfigOpen }: DownloadListDialogProps) {
  const { t } = useTranslationSafe()

  const ColumnConfigLink = useMemo(
    () => (
      <Button color="link" className="p-0" onClick={toggleColumnConfigOpen}>
        {t('Configure columns')}
      </Button>
    ),
    [t, toggleColumnConfigOpen],
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
  const exportInsertionsCsv = useExportInsertionsCsv()
  const exportErrorsCsv = useExportErrorsCsv()

  const exportParams = useMemo(() => DEFAULT_EXPORT_PARAMS, [])

  return (
    <ListGroup flush>
      <ExportFileElement
        Icon={FileIconJson}
        filename={exportParams.filenameJson}
        HelpMain={t('Results of the analysis in JSON format.')}
        HelpDetails={t(
          'Contains detailed results of the analysis, such as clades, mutations, QC metrics etc., in JSON format. Convenient for further automated processing.',
        )}
        HelpDownload={t('Download results of the analysis in JSON format.')}
        onDownload={exportJson}
      />

      <ExportFileElement
        Icon={FileIconNdjson}
        filename={exportParams.filenameNdjson}
        HelpMain={t('Results of the analysis in NDJSON format (newline-delimited JSON).')}
        HelpDetails={t(
          'Contains detailed results of the analysis, such as clades, mutations, QC metrics etc., in NDJSON format. Convenient for further automated processing.',
        )}
        HelpDownload={t('Download results of the analysis in NDJSON format.')}
        onDownload={exportNdjson}
      />

      <ExportFileElement
        Icon={FileIconCsv}
        filename={exportParams.filenameCsv}
        HelpMain={t('Summarized results of the analysis in CSV format.')}
        HelpDetails={t(
          'Contains summarized results of the analysis, such as clades, mutations, QC metrics etc., in tabular format. Convenient for further review and processing using spreadsheets or data-science tools.',
        )}
        HelpDownload={t('Download summarized results in CSV format')}
        Config={ColumnConfigLink}
        onDownload={exportCsv}
      />

      <ExportFileElement
        Icon={FileIconTsv}
        filename={exportParams.filenameTsv}
        HelpMain={t('Summarized results of the analysis in TSV format.')}
        HelpDetails={t(
          'Contains summarized results of the analysis, such as clades, mutations, QC metrics etc in tabular format. Convenient for further review and processing using spreadsheets or data-science tools.',
        )}
        HelpDownload={t('Download summarized results in TSV format')}
        Config={ColumnConfigLink}
        onDownload={exportTsv}
      />

      <ExportFileElement
        Icon={FileIconJson}
        filename={exportParams.filenameTree}
        HelpMain={t('Phylogenetic tree with sequences placed onto it.')}
        HelpDetails={
          <>
            {t('The tree is in Nextstrain format.')} {t('Can be viewed locally with Nextstrain Auspice or in ')}
            <LinkExternal url="https://auspice.us">{'auspice.us'}</LinkExternal>
            {'.'}
          </>
        }
        HelpDownload={t('Download phylogenetic tree with sequences placed onto it, in Auspice JSON v2 format.')}
        onDownload={exportTree}
      />

      <ExportFileElement
        Icon={FileIconFasta}
        filename={exportParams.filenameFasta}
        HelpMain={t('Aligned sequences in FASTA format.')}
        HelpDetails={t('Contains aligned sequences in FASTA format.')}
        HelpDownload={t('Download aligned sequences in FASTA format.')}
        onDownload={exportFasta}
      />

      <ExportFileElement
        Icon={FileIconZip}
        filename={exportParams.filenamePeptidesZip}
        HelpMain={t('Aligned peptides in FASTA format, zipped')}
        HelpDetails={t(
          'Contains results of translation of your sequences. One FASTA file per gene, all in a zip archive.',
        )}
        HelpDownload={t('Download aligned peptides in FASTA format, one file per gene, all in a zip archive.')}
        onDownload={exportPeptides}
      />

      <ExportFileElement
        Icon={FileIconCsv}
        filename={exportParams.filenameInsertionsCsv}
        HelpMain={t('Insertions in CSV format.')}
        HelpDetails={t('Contains insertions stripped from aligned sequences.')}
        HelpDownload={t('Download insertions in CSV format')}
        onDownload={exportInsertionsCsv}
      />

      <ExportFileElement
        Icon={FileIconCsv}
        filename={exportParams.filenameErrorsCsv}
        HelpMain={t('Errors, warnings, and failed genes in CSV format.')}
        HelpDetails={t(
          'Contains a list of errors, a list of warnings and a list of genes that failed processing, per sequence, in CSV format.',
        )}
        HelpDownload={t('Download warnings, and failed genes in CSV format')}
        onDownload={exportErrorsCsv}
      />

      <ExportFileElement
        Icon={FileIconZip}
        filename={exportParams.filenameZip}
        HelpMain={t('All files in a zip archive.')}
        HelpDetails={t('Contains all of the above files in a single zip file.')}
        HelpDownload={t('Download all in zip archive')}
        onDownload={exportZip}
      />
    </ListGroup>
  )
}

export function CsvColumnConfigDialog() {
  const { t } = useTranslationSafe()
  const [csvColumnConfig, setCsvColumnConfig] = useRecoilState(csvColumnConfigAtom)

  const categories = useMemo(
    () =>
      Object.entries(csvColumnConfig?.categories ?? {}).map(([category, columns]) => (
        <CsvColumnConfigCategory key={category} category={category} columns={columns} />
      )),
    [csvColumnConfig],
  )

  const allState = useMemo(() => {
    const columns = Object.values(csvColumnConfig?.categories ?? {}).flatMap((columns) => Object.values(columns))
    const totalColumns = columns.length
    const numEnabledColumns = columns.filter(Boolean).length
    if (numEnabledColumns === 0 && !csvColumnConfig?.includeDynamic) {
      return CheckboxState.Unchecked
    }
    if (numEnabledColumns === totalColumns && csvColumnConfig?.includeDynamic) {
      return CheckboxState.Checked
    }
    return CheckboxState.Indeterminate
  }, [csvColumnConfig?.categories, csvColumnConfig?.includeDynamic])

  const onAllChange = useCallback(
    (state: CheckboxState) => {
      setCsvColumnConfig((config) => {
        if (!config) {
          return config
        }
        if (state === CheckboxState.Checked) {
          const newState = enableAllCategories(config, true)
          newState.includeDynamic = true
          return newState
        }
        if (state === CheckboxState.Unchecked) {
          const newState = enableAllCategories(config, false)
          newState.individual = []
          newState.includeDynamic = false
          return newState
        }
        return config
      })
    },
    [setCsvColumnConfig],
  )

  const all = useMemo(
    () => (
      <FormGroup inline check>
        <Label check>
          <CheckboxIndeterminate type="checkbox" state={allState} onChange={onAllChange} />
          {t('All categories')}
        </Label>
      </FormGroup>
    ),
    [allState, onAllChange, t],
  )

  const dynamicColumnsState = useMemo(() => csvColumnConfig?.includeDynamic ?? false, [csvColumnConfig?.includeDynamic])

  const onDynamicColumnsStateChange = useCallback(() => {
    setCsvColumnConfig((config) => (config ? { ...config, includeDynamic: !config.includeDynamic } : undefined))
  }, [setCsvColumnConfig])

  const dynamic = useMemo(
    () => (
      <FormGroup inline check>
        <Label check>
          <Input type="checkbox" checked={dynamicColumnsState} onChange={onDynamicColumnsStateChange} />
          <TextWithHelp
            title={t(
              'Various optional columns, such as custom clades and phenotypes might be available depending on dataset',
            )}
          >
            {t('Dataset-specific columns')}
          </TextWithHelp>
        </Label>
      </FormGroup>
    ),
    [dynamicColumnsState, onDynamicColumnsStateChange, t],
  )

  return (
    <div>
      <Row noGutters>
        <Col>
          <p>
            {t('Here you can select columns (individual or categories) which will be written into CSV and TSV files.')}
          </p>
        </Col>
      </Row>
      <Row noGutters>
        <Col>
          <Form>
            <CategoryCard header={all} />
            {categories}
            <CategoryCard header={dynamic} />
          </Form>
        </Col>
      </Row>
    </div>
  )
}

export interface CsvColumnConfigCategoryProps {
  category: string
  columns: Record<string, boolean>
}

export function CsvColumnConfigCategory({ category, columns }: CsvColumnConfigCategoryProps) {
  const { t } = useTranslationSafe()
  const stopPropagation = useStopPropagation()
  const setCsvColumnConfig = useSetRecoilState(csvColumnConfigAtom)

  const categoryState = useMemo(() => {
    const totalColumns = Object.keys(columns).length
    const numColumnsEnabled = Object.values(columns).filter(Boolean).length
    if (numColumnsEnabled === 0) {
      return CheckboxState.Unchecked
    }
    if (numColumnsEnabled === totalColumns) {
      return CheckboxState.Checked
    }
    return CheckboxState.Indeterminate
  }, [columns])

  const onCategoryStateChange = useCallback(
    (state: CheckboxState) => {
      if (state === CheckboxState.Checked) {
        setCsvColumnConfig((config) => config && enableCategory(config, category, true))
      } else if (state === CheckboxState.Unchecked) {
        setCsvColumnConfig((config) => config && enableCategory(config, category, false))
      }
    },
    [category, setCsvColumnConfig],
  )

  const headerComponent = useMemo(() => {
    const categoryName =
      get(
        {
          'general': t('General'),
          'ref-muts': t('Mutations relative to reference sequence'),
          'priv-muts': t('Mutations relative to nearest node (private mutations)'),
          'qc': t('Quality control'),
          'primers': t('PCR primers'),
          'errs-warns': t('Errors & warnings'),
        },
        category,
      ) ?? category

    return (
      <FormGroup inline check onClick={stopPropagation}>
        <Label check>
          <CheckboxIndeterminate state={categoryState} onChange={onCategoryStateChange} />
          <span>{categoryName}</span>
        </Label>
      </FormGroup>
    )
  }, [category, categoryState, onCategoryStateChange, stopPropagation, t])

  const columnComponents = useMemo(
    () =>
      Object.keys(columns).map((column) => <CsvColumnConfigColumn key={column} category={category} column={column} />),
    [category, columns],
  )

  return <CategoryCard header={headerComponent}>{columnComponents}</CategoryCard>
}

const CategoryCard = styled(CardCollapsible)`
  box-shadow: none;
  border: ${(props) => props.theme.gray500} solid 1px;
  border-radius: 0;

  :first-child {
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
  }

  :last-child {
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
  }

  :not(:last-child) {
    border-bottom: none;
  }

  & .card-header {
    padding: 0.5rem;
    background-color: ${(props) => props.theme.gray200};
  }

  & .card-body {
    padding: 0.5rem;
    padding-left: 1.5rem;
  }
`

export const TextWithHelp = styled.span`
  border-bottom: 1px dashed ${(props) => rgba(props.theme.bodyColor, 0.5)};
  text-decoration: none;
  cursor: help;
`

export interface CsvColumnConfigColumnProps {
  category: string
  column: string
}

export function CsvColumnConfigColumn({ category, column }: CsvColumnConfigColumnProps) {
  const [csvColumnConfig, setCsvColumnConfigAtom] = useRecoilState(csvColumnConfigAtom)

  const checked = useMemo(() => getColumnState(csvColumnConfig, category, column), [category, column, csvColumnConfig])

  const onChange = useCallback(() => {
    setCsvColumnConfigAtom((config: CsvColumnConfig | undefined) => {
      const previousEnabled = getColumnState(config, category, column)
      return config && enableColumn(config, category, column, !previousEnabled)
    })
  }, [category, column, setCsvColumnConfigAtom])

  return (
    <FormGroup check className="ml-3">
      <Label check>
        <Input type="checkbox" checked={checked} onChange={onChange} />
        <code>{column}</code>
      </Label>
    </FormGroup>
  )
}

function getColumnState(config: CsvColumnConfig | undefined, category: string, column: string): boolean {
  if (!config) {
    return false
  }

  const columns = get(config.categories, category)
  if (!columns) {
    return false
  }

  return get(columns, column) ?? false
}

function enableColumn(config: CsvColumnConfig, category: string, column: string, enabled: boolean): CsvColumnConfig {
  const columns = get(config.categories, category)
  if (!columns) {
    return config
  }

  const newColumns = { ...columns, [column]: enabled }

  return { ...config, categories: { ...config?.categories, [category]: newColumns } }
}

function enableCategory(config: CsvColumnConfig, category: string, enable: boolean): CsvColumnConfig {
  let columns = get(config.categories, category)
  columns = mapValues(columns, (_) => enable)
  const newCategories = { ...config.categories, [category]: columns }
  return { ...config, categories: newCategories }
}

function enableAllCategories(config_: CsvColumnConfig, enable: boolean): CsvColumnConfig {
  let config = copy(config_)
  const categories = Object.keys(config?.categories ?? {})
  // eslint-disable-next-line no-loops/no-loops
  for (const category of categories) {
    config = enableCategory(config, category, enable)
  }
  return config
}
