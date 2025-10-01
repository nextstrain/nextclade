import React, { useCallback, useMemo } from 'react'
import { useRecoilValue, useSetRecoilState } from 'recoil'
import styled from 'styled-components'
import Select from 'react-select'
import type { ActionMeta, OnChangeValue } from 'react-select'
import { allDatasetsAtom, datasetSingleCurrentAtom } from 'src/state/dataset.state'
import { formatUpdatedAt } from 'src/components/Main/datasetInfoHelpers'
import { DatasetTagBadge } from 'src/components/Main/DatasetTagBadge'
import { sortDatasetVersions } from 'src/helpers/sortDatasetVersions'
import { TFunc, useTranslationSafe } from 'src/helpers/useTranslationSafe'
import type { Dataset, DatasetVersion } from 'src/types'

export interface DatasetTagSelectorProps {
  dataset: Dataset
  children?: React.ReactNode
}

interface TagOption {
  value: string
  label: string
  isLatest: boolean
  isUnreleased: boolean
}

function formatTagLabel(version: DatasetVersion, t: TFunc): string {
  return formatUpdatedAt(version, t)
}

function getAvailableVersions(dataset: Dataset, allDatasets: Dataset[]): DatasetVersion[] {
  if (!dataset.path) {
    return []
  }

  const datasetsWithSamePath = allDatasets.filter((d) => d.path === dataset.path)

  const versions = new Map<string, DatasetVersion>()
  datasetsWithSamePath.forEach((d) => {
    if (d.version?.tag) {
      versions.set(d.version.tag, d.version)
    }
  })

  if (dataset.versions) {
    dataset.versions.forEach((version) => {
      if (version.tag) {
        versions.set(version.tag, version)
      }
    })
  }

  return sortDatasetVersions(Array.from(versions.values()))
}

export function DatasetTagSelector({ dataset, children }: DatasetTagSelectorProps): JSX.Element {
  const { t } = useTranslationSafe()
  const allDatasets = useRecoilValue(allDatasetsAtom)
  const setDatasetCurrent = useSetRecoilState(datasetSingleCurrentAtom)

  const availableVersions = useMemo(() => getAvailableVersions(dataset, allDatasets), [dataset, allDatasets])

  const options: TagOption[] = useMemo(
    () =>
      availableVersions.map((version, index) => ({
        value: version.tag,
        label: formatTagLabel(version, t),
        isLatest: version.tag !== 'unreleased' && index === 0,
        isUnreleased: version.tag === 'unreleased',
      })),
    [availableVersions, t],
  )

  const selectedValue = useMemo(() => {
    const currentTag = dataset.version?.tag
    if (!currentTag) {
      return undefined
    }
    const versionIndex = availableVersions.findIndex((v) => v.tag === currentTag)
    const version = availableVersions[versionIndex]
    return version
      ? {
          value: currentTag,
          label: formatTagLabel(version, t),
          isLatest: currentTag !== 'unreleased' && versionIndex === 0,
          isUnreleased: currentTag === 'unreleased',
        }
      : undefined
  }, [dataset.version?.tag, availableVersions, t])

  const handleChange = useCallback(
    (newValue: OnChangeValue<TagOption, false>, _actionMeta: ActionMeta<TagOption>) => {
      if (!newValue) {
        return
      }

      const selectedDataset = allDatasets.find((d) => d.path === dataset.path && d.version?.tag === newValue.value)

      if (selectedDataset) {
        setDatasetCurrent(selectedDataset)
      }
    },
    [allDatasets, dataset.path, setDatasetCurrent],
  )

  const formatOptionLabel = useCallback(
    (option: TagOption) => (
      <OptionLabelContainer>
        <span>{option.label}</span>
        <DatasetTagBadge tag={option.value} versions={availableVersions} t={t} />
      </OptionLabelContainer>
    ),
    [availableVersions, t],
  )

  const selectStyles = useMemo(
    () => ({
      control: (base: Record<string, unknown>) => ({
        ...base,
        minHeight: '18px',
        height: '18px',
        fontSize: '0.9rem',
        border: 'none',
        background: 'transparent',
        boxShadow: 'none',
        cursor: 'pointer',
        color: 'inherit',
      }),
      valueContainer: (base: Record<string, unknown>) => ({
        ...base,
        height: '18px',
        padding: '0',
        color: 'inherit',
      }),
      singleValue: (base: Record<string, unknown>) => ({
        ...base,
        color: 'inherit',
        margin: '0',
        cursor: 'pointer',
        fontSize: '0.9rem',
      }),
      input: (base: Record<string, unknown>) => ({
        ...base,
        margin: '0',
        padding: '0',
        color: 'inherit',
      }),
      indicatorSeparator: () => ({
        display: 'none',
      }),
      indicatorsContainer: (base: Record<string, unknown>) => ({
        ...base,
        height: '18px',
      }),
      dropdownIndicator: (base: Record<string, unknown>) => ({
        ...base,
        padding: '0 2px',
        cursor: 'pointer',
      }),
      menu: (base: Record<string, unknown>) => ({
        ...base,
        fontSize: '0.9rem',
        maxHeight: '300px',
      }),
      menuList: (base: Record<string, unknown>) => ({
        ...base,
        maxHeight: '300px',
        overflowY: 'auto' as const,
        padding: '4px 0',
      }),
      option: (base: Record<string, unknown>, state: { isFocused?: boolean; isSelected?: boolean }) => ({
        ...base,
        'cursor': 'pointer',
        'fontSize': '0.9rem',
        'padding': '3px 8px',
        'backgroundColor': state.isSelected ? '#007bff' : state.isFocused ? '#e9ecef' : 'transparent',
        'color': state.isSelected ? '#ffffff' : 'inherit',
        ':active': {
          backgroundColor: state.isSelected ? '#007bff' : '#dee2e6',
        },
      }),
      menuPortal: (base: Record<string, unknown>) => ({
        ...base,
        zIndex: 9999,
      }),
    }),
    [],
  )

  if (availableVersions.length <= 1) {
    return (
      <>
        {children}
        <span />
      </>
    )
  }

  return (
    <SelectorContainer>
      <Label>{t('Updated at:')}</Label>
      <StyledSelect
        options={options}
        value={selectedValue}
        onChange={handleChange}
        formatOptionLabel={formatOptionLabel}
        isSearchable={false}
        isClearable={false}
        menuPlacement="auto"
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        styles={selectStyles}
      />
    </SelectorContainer>
  )
}

const SelectorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  padding: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: inherit;

  &:after {
    content: ' ';
    white-space: pre;
  }
`

const Label = styled.span`
  flex-shrink: 0;
  color: inherit;
`

const StyledSelect = styled(Select)`
  flex: 1;
  min-width: 0;
` as typeof Select

const OptionLabelContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: space-between;
  width: 100%;
`
