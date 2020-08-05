import React, { useCallback, useState } from 'react'

import { partition, isEmpty } from 'lodash'
import { Input, Form } from 'reactstrap'
import styled from 'styled-components'
import { useDebouncedCallback } from 'use-debounce'

import { FormSection, Label } from './Form'
import { TreeFilterCheckbox } from './TreeFilterCheckbox'

export const SEARCH_INPUT_DEBOUNCE_DELAY = 250

export const LabelText = styled.div`
  padding-bottom: 5px;
  margin-bottom: 7px;
  border-bottom: 1px solid ${(props) => props.theme.gray400};
`

export const FormSectionStyled = styled(FormSection)`
  overflow: auto;
`

export const FormSectionContent = styled.div`
  height: 15vh;
  overflow: auto;
`

export const InputStyled = styled(Input)`
  height: 28px;
  margin-bottom: 7px;
  font-size: 0.9rem;

  &::-webkit-search-cancel-button {
    cursor: pointer;
  }
`

export function includesLowerCase(candidate: string, searchTerm: string): boolean {
  return candidate.toLowerCase().includes(searchTerm.toLowerCase())
}

export function startsWithLowerCase(candidate: string, searchTerm: string): boolean {
  return candidate.toLowerCase().startsWith(searchTerm.toLowerCase())
}

export function search(candidates: string[], term: string): string[] {
  const terms = term
    .split(/[\s,;]/)
    .map((term) => term.trim())
    .filter((term) => !isEmpty(term))

  if (isEmpty(terms)) {
    return candidates
  }

  const [itemsStartWith, itemsNotStartWith] = partition(candidates, (candidate) =>
    terms.some((term) => startsWithLowerCase(candidate, term)),
  )

  const [itemsInclude] = partition(itemsNotStartWith, (candidate) =>
    terms.some((term) => includesLowerCase(candidate, term)),
  )

  return [...itemsStartWith, ...itemsInclude]
}

export interface TreeFilterCheckboxGroupProps {
  name: string
  trait: string
  values: string[]
}

export function TreeFilterCheckboxGroup({ name, trait, values }: TreeFilterCheckboxGroupProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredValues, setFilteredValues] = useState(values)

  const applySearchRaw = (term: string) => {
    const hasSearchTerm = term.length > 0
    const filtered = hasSearchTerm ? search(values, term) : values
    setFilteredValues(filtered)
  }

  const applySearch = useCallback(applySearchRaw, [values])
  const [applySearchDebounced] = useDebouncedCallback(applySearchRaw, SEARCH_INPUT_DEBOUNCE_DELAY)

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setSearchTerm(value)
      applySearchDebounced(value)
    },
    [applySearchDebounced],
  )

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const isEnterKey = event.keyCode === 13

      if (isEnterKey) {
        applySearch(searchTerm)
      }
    },
    [applySearch, searchTerm],
  )

  return (
    <FormSectionStyled>
      <Label title={name}>
        <Form className="d-flex">
          <InputStyled
            type="search"
            placeholder={name}
            title={name}
            value={searchTerm}
            onChange={onChange}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-gramm="false"
          />
        </Form>
        <FormSectionContent>
          {filteredValues.map((value) => (
            <TreeFilterCheckbox key={value} text={value} trait={trait} value={value} />
          ))}
        </FormSectionContent>
      </Label>
    </FormSectionStyled>
  )
}
