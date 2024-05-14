/* eslint-disable @typescript-eslint/ban-ts-comment */
import { rgba } from 'polished'
import React, { useCallback, useMemo } from 'react'
import type { ActionMeta, GroupBase, OnChangeValue } from 'react-select/dist/declarations/src/types'
import { useRecoilState, useRecoilValue } from 'recoil'
import Select, { OptionProps } from 'react-select'
import { IsMultiValue } from 'src/components/Common/Dropdown'
import { DropdownOption } from 'src/components/Common/DropdownOption'
import { currentRefNodeNameAtom, refNodesAtom } from 'src/state/results.state'
import styled from 'styled-components'
import { SelectComponents } from 'react-select/dist/declarations/src/components'

interface RefNodeSelectorDatum {
  value: string
  label: string
  description?: string
}

const builtinRefs: RefNodeSelectorDatum[] = [
  {
    value: '_root',
    label: 'Reference',
    description: 'Reference sequence',
  },
  {
    value: '_parent',
    label: 'Parent',
    description: 'Nearest node on reference tree',
  },
]

export function RefNodeSelector() {
  const refNodes = useRecoilValue(refNodesAtom)
  const [currentRefNodeName, setCurrentRefNodeName] = useRecoilState(currentRefNodeNameAtom)

  const { options, currentOption } = useMemo(() => {
    const refs = refNodes.map((node) => ({
      value: node.name,
      label: node.displayName ?? node.name,
      description: node.description,
    }))
    const options = [...builtinRefs, ...refs]
    const currentOption = options.find((o) => o.value === currentRefNodeName)

    return { options, currentOption }
  }, [currentRefNodeName, refNodes])

  const handleChange = useCallback(
    (option: OnChangeValue<DropdownOption<string>, IsMultiValue>, _actionMeta: ActionMeta<DropdownOption<string>>) => {
      if (option) {
        setCurrentRefNodeName(option.value)
      }
    },
    [setCurrentRefNodeName],
  )

  return (
    <Select
      className="w-25"
      components={COMPONENTS}
      options={options}
      value={currentOption}
      isMulti={false}
      onChange={handleChange}
      menuPortalTarget={document.body}
    />
  )
}

const COMPONENTS: Partial<SelectComponents<RefNodeSelectorDatum, false, GroupBase<RefNodeSelectorDatum>>> = {
  Option: RefNodeSelectorOption,
}

function RefNodeSelectorOption({
  data,
  isDisabled,
  isFocused,
  isSelected,
  innerRef,
  innerProps,
}: OptionProps<RefNodeSelectorDatum, false>) {
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
