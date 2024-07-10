/* eslint-disable @typescript-eslint/ban-ts-comment */
import { rgba } from 'polished'
import React, { useCallback, useMemo } from 'react'
import { getCladeNodeAttrFounderSearchId } from 'src/helpers/relativeMuts'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import type { ActionMeta, GroupBase, OnChangeValue, Theme } from 'react-select/dist/declarations/src/types'
import { useRecoilState, useRecoilValue } from 'recoil'
import Select, { OptionProps, StylesConfig } from 'react-select'
import { IsMultiValue } from 'src/components/Common/Dropdown'
import { DropdownOption } from 'src/components/Common/DropdownOption'
import { cladeNodeAttrDescsAtom, currentRefNodeNameAtom, refNodesAtom } from 'src/state/results.state'
import { SelectComponents } from 'react-select/dist/declarations/src/components'
import { REF_NODE_CLADE_FOUNDER, REF_NODE_PARENT, REF_NODE_ROOT } from 'src/constants'

interface Option {
  value: string
  label: string
  description?: string
}

export function RefNodeSelector() {
  const { t } = useTranslationSafe()

  const refNodes = useRecoilValue(refNodesAtom)
  const cladeNodeAttrDescs = useRecoilValue(cladeNodeAttrDescsAtom)
  const [currentRefNodeName, setCurrentRefNodeName] = useRecoilState(currentRefNodeNameAtom)

  const { options, currentOption } = useMemo(() => {
    const refs = (refNodes.search ?? []).map((search) => ({
      value: search.name,
      label: search.displayName ?? search.name,
      description: search.description,
    }))

    const cladeNodeAttrFounders = cladeNodeAttrDescs
      .filter((desc) => !desc.skipAsReference)
      .map((desc) => {
        const searchId = getCladeNodeAttrFounderSearchId(desc.name)
        return {
          value: searchId,
          label: t('"{{ attr }}" founder', { attr: desc.displayName }),
          description: t("Earliest ancestor node having the same value of attribute '{{ attr }}'", {
            attr: desc.displayName,
          }),
        }
      })

    const builtinRefs: Option[] = [
      {
        value: REF_NODE_ROOT,
        label: t('Reference'),
        description: t('Reference sequence'),
      },
      {
        value: REF_NODE_PARENT,
        label: t('Parent'),
        description: t('Nearest node on reference tree'),
      },
      {
        value: REF_NODE_CLADE_FOUNDER,
        label: t('Clade founder'),
        description: t('Earliest ancestor node with the same clade on reference tree'),
      },
    ]

    const options = [...builtinRefs, ...cladeNodeAttrFounders, ...refs]
    const currentOption = options.find((o) => o.value === currentRefNodeName)

    return { options, currentOption }
  }, [cladeNodeAttrDescs, currentRefNodeName, refNodes.search, t])

  const handleChange = useCallback(
    (option: OnChangeValue<DropdownOption<string>, IsMultiValue>, _actionMeta: ActionMeta<DropdownOption<string>>) => {
      if (option) {
        setCurrentRefNodeName(option.value)
      }
    },
    [setCurrentRefNodeName],
  )

  const reactSelectTheme = useCallback((theme: Theme): Theme => {
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
  }, [])

  const reactSelectStyles = useMemo((): StylesConfig<Option, false> => {
    return {
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      menuList: (base) => ({ ...base, fontSize: '1rem' }),
      option: (base) => ({ ...base, fontSize: '1.0rem', padding: '2px 8px' }),
      singleValue: (base, state) => ({
        ...base,
        fontSize: '1.0rem',
        display: state.selectProps.menuIsOpen ? 'none' : 'block',
      }),
    }
  }, [])

  return (
    <div>
      <Select
        components={COMPONENTS}
        options={options}
        value={currentOption}
        isMulti={false}
        onChange={handleChange}
        menuPortalTarget={document.body}
        styles={reactSelectStyles}
        theme={reactSelectTheme}
        maxMenuHeight={400}
      />
    </div>
  )
}

const COMPONENTS: Partial<SelectComponents<Option, false, GroupBase<Option>>> = {
  Option: RefNodeSelectorOption,
}

function RefNodeSelectorOption({
  data,
  isDisabled,
  isFocused,
  isSelected,
  innerRef,
  innerProps,
}: OptionProps<Option, false>) {
  return (
    <OptionBody
      // @ts-ignore
      ref={innerRef}
      aria-disabled={isDisabled}
      isSelected={isSelected}
      isDisabled={isDisabled}
      isFocused={isFocused}
      {...innerProps}
    >
      <div>{data.label}</div>
      <div className="small">{data.description}</div>
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
