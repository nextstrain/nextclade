import { isEmpty, isNil } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import { Badge } from 'reactstrap'
import { rgba } from 'polished'
import { hasSeqsWithoutDatasetSuggestionsAtom } from 'src/state/autodetect.state'
import styled from 'styled-components'
import { useRecoilState, useRecoilValue } from 'recoil'
import Select, { OptionProps, StylesConfig } from 'react-select'
import type { SelectComponents } from 'react-select/dist/declarations/src/components'
import type { ActionMeta, GroupBase, OnChangeValue, Theme } from 'react-select/dist/declarations/src/types'
import { attrStrMaybe, Dataset } from 'src/types'
import type { IsMultiValue } from 'src/components/Common/Dropdown'
import { datasetsForAnalysisAtom, UNKNOWN_DATASET_NAME, viewedDatasetNameAtom } from 'src/state/dataset.state'
import { allTreesAtom } from 'src/state/results.state'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

interface Option {
  value: string
  label: string
  dataset?: Dataset
  hasTree?: boolean
}

export function ViewedDatasetSelector() {
  const { t } = useTranslationSafe()
  const [viewedDatasetName, setViewedDatasetName] = useRecoilState(viewedDatasetNameAtom)
  const hasSeqsWithoutDatasetSuggestions = useRecoilValue(hasSeqsWithoutDatasetSuggestionsAtom)
  const datasets = useRecoilValue(datasetsForAnalysisAtom)
  const allTrees = useRecoilValue(allTreesAtom)

  const { options, currentOption } = useMemo(() => {
    const options: Option[] = (datasets ?? []).map((dataset) => {
      const hasTree = !isNil(allTrees.get(dataset.path))
      return {
        value: dataset.path,
        dataset,
        label: attrStrMaybe(dataset.attributes, 'name') ?? dataset.path,
        hasTree,
      }
    })
    if (hasSeqsWithoutDatasetSuggestions) {
      options.push({ value: UNKNOWN_DATASET_NAME, label: t('Unclassified') })
    }
    const currentOption = options.find((o) => o.value === viewedDatasetName) ?? options[0]
    return { options, currentOption }
  }, [allTrees, datasets, hasSeqsWithoutDatasetSuggestions, t, viewedDatasetName])

  const handleChange = useCallback(
    (option: OnChangeValue<Option, IsMultiValue>, _: ActionMeta<Option>) => {
      if (option) {
        if (option.value === UNKNOWN_DATASET_NAME) {
          setViewedDatasetName(option.value)
          return
        }
        const datasetName = options.find((o) => o.value === option.value)?.dataset?.path
        if (datasetName !== UNKNOWN_DATASET_NAME && (isNil(datasetName) || isEmpty(datasetName))) {
          throw new ErrorInternal(
            `Attempted to select a non-existent dataset in the viewed dataset dropdown menu: '${option.value}'`,
          )
        }
        setViewedDatasetName(datasetName)
      }
    },
    [options, setViewedDatasetName],
  )

  return (
    <Select
      components={COMPONENTS}
      options={options}
      value={currentOption}
      isMulti={false}
      onChange={handleChange}
      menuPortalTarget={document.body}
      styles={STYLES}
      theme={getTheme}
      maxMenuHeight={400}
    />
  )
}

function OptionComponent({ data, ...restProps }: OptionProps<Option, false>) {
  if (!isNil(data.dataset)) {
    const props = {
      data: { ...data, dataset: data.dataset },
      ...restProps,
    } as OptionProps<Option & { dataset: Dataset }, false> // FIXME: fix types
    return <OptionComponentDataset {...props} />
  }
  return <OptionComponentUnknownDataset data={data} {...restProps} />
}

function OptionComponentDataset({
  data: { dataset, hasTree },
  isDisabled,
  isFocused,
  isSelected,
  innerRef,
  innerProps,
}: OptionProps<Option & { dataset: Dataset }, false>) {
  const { t } = useTranslationSafe()

  const { path, name, reference } = useMemo(() => {
    const { path, attributes } = dataset
    const name = attrStrMaybe(attributes, 'name') ?? t('Unknown')
    const referenceName = attrStrMaybe(attributes, 'reference name') ?? t('Unknown')
    const referenceAccession = attrStrMaybe(attributes, 'reference accession') ?? t('Unknown')
    const reference = `${referenceName} (${referenceAccession})`
    return { path, name, reference }
  }, [dataset, t])

  return (
    <OptionBody
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      ref={innerRef}
      isSelected={isSelected}
      isFocused={isFocused}
      isDisabled={isDisabled}
      aria-disabled={isDisabled}
      {...innerProps}
    >
      <div>
        <span>{name}</span>
        {!hasTree && (
          <Badge
            title={t('This dataset does not provide a reference tree. Related functionality is disabled.')}
            className="ml-1"
            color="secondary"
            size="sm"
          >
            {t('no tree')}
          </Badge>
        )}
      </div>
      <div className="small">{reference}</div>
      <div className="small">{path}</div>
    </OptionBody>
  )
}

function OptionComponentUnknownDataset({ isFocused, isSelected, innerRef, innerProps }: OptionProps<Option, false>) {
  const { t } = useTranslationSafe()
  return (
    <OptionBody
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      ref={innerRef}
      isSelected={isSelected}
      isFocused={isFocused}
      {...innerProps}
    >
      <div>
        <span>{t('Unclassified')}</span>
      </div>
      <div className="small">{t('Sequences without dataset detected')}</div>
      <div className="small">&nbsp;</div>
    </OptionBody>
  )
}

const OptionBody = styled.div<{ isSelected?: boolean; isFocused?: boolean; isDisabled?: boolean }>`
  padding: 0.4rem 0.2rem;
  cursor: ${(p) => (p.isDisabled ? 'not-allowed' : 'pointer')};
  pointer-events: auto;
  background-color: ${(p) =>
    p.isSelected
      ? p.theme.primary
      : p.isFocused
      ? rgba(p.theme.primary, p.isDisabled ? 0.1 : 0.33)
      : p.isDisabled
      ? '#f9f9f9'
      : 'inherit'};
  color: ${(p) => (p.isDisabled ? rgba('#ccc', p.isFocused ? 0.8 : 1) : p.isSelected ? 'white' : 'inherit')};
`

const COMPONENTS: Partial<SelectComponents<Option, false, GroupBase<Option>>> = {
  Option: OptionComponent,
}

function getTheme(theme: Theme): Theme {
  return {
    ...theme,
    borderRadius: 2,
    spacing: {
      ...theme.spacing,
      menuGutter: 0,
    },
    colors: {
      ...theme.colors,
    },
  }
}

const STYLES: StylesConfig<Option, false> = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({ ...base, width: 400 }),
  menuList: (base) => ({ ...base, fontSize: '1rem' }),
  option: (base) => ({ ...base, fontSize: '1.0rem', padding: '2px 8px' }),
  singleValue: (base, state) => ({
    ...base,
    fontSize: '1.0rem',
    display: state.selectProps.menuIsOpen ? 'none' : 'block',
  }),
}
