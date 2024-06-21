import { get, mapValues } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import { MdCheck, MdFileDownload } from 'react-icons/md'
import { useRecoilState, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import copy from 'fast-copy'
import { rgba } from 'polished'
import { DEFAULT_EXPORT_PARAMS, useExportTsv, useExportCsv } from 'src/hooks/useExportResults'
import { Button, ButtonProps, Form, FormGroup, Input, Label, Spinner } from 'reactstrap'
import type { CsvColumnConfig } from 'src/types'
import { csvColumnConfigAtom } from 'src/state/results.state'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { CardCollapsible } from 'src/components/Common/CardCollapsible'
import { useStopPropagation } from 'src/hooks/useStopPropagation'
import { CheckboxIndeterminate, CheckboxState } from 'src/components/Common/CheckboxIndeterminate'

export function ExportTabColumnConfig({ setActiveTabId }: { setActiveTabId(id: string): void }) {
  const { t } = useTranslationSafe()
  const [csvColumnConfig, setCsvColumnConfig] = useRecoilState(csvColumnConfigAtom)

  const exportParams = useMemo(() => DEFAULT_EXPORT_PARAMS, [])
  const { isDone: isDoneCsv, isRunning: isRunningCsv, fn: exportCsv_ } = useExportCsv()
  const { isDone: isDoneTsv, isRunning: isRunningTsv, fn: exportTsv_ } = useExportTsv()
  const exportCsv = useCallback(() => exportCsv_(exportParams.filenameCsv), [exportCsv_, exportParams.filenameCsv])
  const exportTsv = useCallback(() => exportTsv_(exportParams.filenameTsv), [exportParams.filenameTsv, exportTsv_])

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
          newState.includeCladeFounderMuts = true
          newState.includeRelMuts = true
          return newState
        }
        if (state === CheckboxState.Unchecked) {
          const newState = enableAllCategories(config, false)
          newState.individual = []
          newState.includeDynamic = false
          newState.includeCladeFounderMuts = false
          newState.includeRelMuts = false
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

  const cladeFounderMutsColumnState = useMemo(
    () => csvColumnConfig?.includeCladeFounderMuts ?? false,
    [csvColumnConfig?.includeCladeFounderMuts],
  )

  const onCladeFounderMutsColumnStateChange = useCallback(() => {
    setCsvColumnConfig((config) =>
      config
        ? {
            ...config,
            includeCladeFounderMuts: !config.includeCladeFounderMuts,
          }
        : undefined,
    )
  }, [setCsvColumnConfig])

  const cladeFounderMuts = useMemo(
    () => (
      <FormGroup inline check>
        <Label check>
          <Input type="checkbox" checked={cladeFounderMutsColumnState} onChange={onCladeFounderMutsColumnStateChange} />
          <TextWithHelp title={t('Mutations relative to the founder of the corresponding clade')}>
            {t('Mutations relative to clade founder')}
          </TextWithHelp>
        </Label>
      </FormGroup>
    ),
    [cladeFounderMutsColumnState, onCladeFounderMutsColumnStateChange, t],
  )

  const relMutsColumnsState = useMemo(() => csvColumnConfig?.includeRelMuts ?? false, [csvColumnConfig?.includeRelMuts])

  const onRelMutsColumnsStateChange = useCallback(() => {
    setCsvColumnConfig((config) => (config ? { ...config, includeRelMuts: !config.includeRelMuts } : undefined))
  }, [setCsvColumnConfig])

  const relMuts = useMemo(
    () => (
      <FormGroup inline check>
        <Label check>
          <Input type="checkbox" checked={relMutsColumnsState} onChange={onRelMutsColumnsStateChange} />
          <TextWithHelp title={t('Mutations relative to nodes of interest (if defined in the dataset tree)')}>
            {t('Mutations relative to nodes of interest (relative mutations)')}
          </TextWithHelp>
        </Label>
      </FormGroup>
    ),
    [onRelMutsColumnsStateChange, relMutsColumnsState, t],
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

  const onClick = useCallback(() => {
    setActiveTabId('files')
  }, [setActiveTabId])

  return (
    <Container>
      <Header>
        <p>
          {t('Here you can select columns (individual or categories) which will be written into CSV and TSV files.')}
        </p>
      </Header>

      <Main>
        <Form>
          <CategoryCard header={all} />
          {categories}
          <CategoryCard header={cladeFounderMuts} />
          <CategoryCard header={relMuts} />
          <CategoryCard header={dynamic} />
        </Form>
      </Main>

      <Footer>
        <div className="mt-2 mr-auto">
          <DownloadButtonStyled
            type="button"
            color="danger"
            onClick={onClick}
            title={t('Return back to list of files')}
          >
            {t('Back to Files')}
          </DownloadButtonStyled>
        </div>

        <div className="mt-2 ml-auto">
          <DownloadButton
            color="success"
            className="mx-1"
            onClick={exportCsv}
            text={t('Download CSV')}
            isDone={isDoneCsv}
            isRunning={isRunningCsv}
          />
          <DownloadButton
            color="primary"
            className="mx-1"
            onClick={exportTsv}
            text={t('Download TSV')}
            isDone={isDoneTsv}
            isRunning={isRunningTsv}
          />
        </div>
      </Footer>
    </Container>
  )
}

interface DownloadButtonProps extends ButtonProps {
  text: string
  isRunning?: boolean
  isDone?: boolean
}

function DownloadButton({ onClick, text, isRunning, isDone, ...restProps }: DownloadButtonProps) {
  const icon = useMemo(() => {
    if (isRunning) {
      return <SpinnerSmall />
    }
    if (isDone) {
      return <SuccessIcon />
    }
    return <DownloadIcon />
  }, [isDone, isRunning])

  return (
    <DownloadButtonStyled type="button" disabled={isRunning} onClick={onClick} title={text} {...restProps}>
      <span className="d-flex w-100">
        <span className="my-auto">{icon}</span>
        <span className="my-auto ml-1">{text}</span>
      </span>
    </DownloadButtonStyled>
  )
}

const SpinnerSmall = styled(Spinner)`
  width: 24px !important;
  height: 24px !important;
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

const DownloadButtonStyled = styled(Button)`
  width: 160px;
  height: 40px;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const Container = styled.div`
  max-width: ${(props) => props.theme.containerMaxWidths.md};
  margin: 0 auto;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`

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

  return { ...config, categories: { ...config.categories, [category]: newColumns } }
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
