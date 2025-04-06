import { isEmpty, isNil } from 'lodash'
import React, { useCallback, useMemo } from 'react'
import { ErrorInternal } from 'src/helpers/ErrorInternal'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { rgba } from 'polished'
import styled from 'styled-components'
import { useRecoilState, useRecoilValue } from 'recoil'
import Select, { OptionProps, StylesConfig } from 'react-select'
import type { SelectComponents } from 'react-select/dist/declarations/src/components'
import type { ActionMeta, GroupBase, OnChangeValue, Theme } from 'react-select/dist/declarations/src/types'
import { attrStrMaybe, Dataset } from 'src/types'
import type { IsMultiValue } from 'src/components/Common/Dropdown'
import { datasetsCurrentAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'

interface Option {
  value: string
  dataset: Dataset
}

export function ViewedDatasetSelector() {
  const [viewedDatasetName, setViewedDatasetName] = useRecoilState(viewedDatasetNameAtom)
  const datasets = useRecoilValue(datasetsCurrentAtom)

  const { options, currentOption } = useMemo(() => {
    const options = (datasets ?? []).map((dataset) => ({ value: dataset.path, dataset, label: dataset.path }))
    const currentOption = options.find((o) => o.value === viewedDatasetName) ?? options[0]
    return { options, currentOption }
  }, [datasets, viewedDatasetName])

  const handleChange = useCallback(
    (option: OnChangeValue<Option, IsMultiValue>, _: ActionMeta<Option>) => {
      if (option) {
        const datasetName = options.find((o) => o.value === option.value)?.dataset.path
        if (isNil(datasetName) || isEmpty(datasetName)) {
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
    <div>
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
    </div>
  )
}

function OptionComponent({
  data: { dataset },
  isDisabled,
  isFocused,
  isSelected,
  innerRef,
  innerProps,
}: OptionProps<Option, false>) {
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
      aria-disabled={isDisabled}
      isSelected={isSelected}
      isDisabled={isDisabled}
      isFocused={isFocused}
      {...innerProps}
    >
      <div>{name}</div>
      <div className="small">{reference}</div>
      <div className="small">{path}</div>
    </OptionBody>
  )
}

const OptionBody = styled.div<{ isSelected?: boolean; isFocused?: boolean; isDisabled?: boolean }>`
  padding: 0.4rem 0.2rem;
  cursor: pointer;
  background-color: ${(props) =>
    props.isSelected ? props.theme.primary : props.isFocused ? rgba(props.theme.primary, 0.33) : undefined};
  color: ${(props) => props.isSelected && 'white'};
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
  menuList: (base) => ({ ...base, fontSize: '1rem' }),
  option: (base) => ({ ...base, fontSize: '1.0rem', padding: '2px 8px' }),
  singleValue: (base, state) => ({
    ...base,
    fontSize: '1.0rem',
    display: state.selectProps.menuIsOpen ? 'none' : 'block',
  }),
}
