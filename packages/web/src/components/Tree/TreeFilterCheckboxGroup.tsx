import React, { useCallback, useState } from 'react'

import { partition, isEmpty, get } from 'lodash'
import { Button, Input } from 'reactstrap'
import styled from 'styled-components'
import { useDebouncedCallback } from 'use-debounce'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import { applyFilter } from 'auspice/src/actions/tree'

import { State } from 'src/state/reducer'

import { FormSection, Label } from './Form'
import { TreeFilterCheckbox } from './TreeFilterCheckbox'

export const SEARCH_INPUT_DEBOUNCE_DELAY = 250

export const LabelStyled = styled(Label)`
  margin-bottom: 0;
`

export const LabelText = styled.div`
  padding-bottom: 5px;
  margin-bottom: 7px;
  border-bottom: 1px solid ${(props) => props.theme.gray400};
`

export const FormSectionStyled = styled(FormSection)`
  overflow: auto;
  margin: 0 4px;
`

export const FormSectionContent = styled.div`
  height: 15vh;
  overflow: auto;
`

export const SearchInput = styled(Input)`
  height: 28px;
  margin-bottom: 7px;
  font-size: 0.9rem;

  &::-webkit-search-cancel-button {
    cursor: pointer;
  }
`
export const ButtonClearFilter = styled(Button)`
  width: 100%;
  margin-top: 7px;
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
  filters?: Record<string, string[]>
  applyFilter(mode: string, trait: string, values: string[]): void
}

const mapStateToProps = (state: State) => ({
  filters: state.controls?.filters,
})

const mapDispatchToProps = { applyFilter }

export const TreeFilterCheckboxGroup = connect(mapStateToProps, mapDispatchToProps)(TreeFilterCheckboxGroupDisconnected)

export function TreeFilterCheckboxGroupDisconnected({
  name,
  trait,
  values,
  filters,
  applyFilter,
}: TreeFilterCheckboxGroupProps) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [foundValues, setFoundValues] = useState(values)
  const hasFilters = !isEmpty(get(filters, trait))

  const applySearchRaw = (term: string) => {
    const hasSearchTerm = term.length > 0
    const found = hasSearchTerm ? search(values, term) : values
    setFoundValues(found)
  }

  const applySearch = useCallback(applySearchRaw, [values])
  const [applySearchDebounced] = useDebouncedCallback(applySearchRaw, SEARCH_INPUT_DEBOUNCE_DELAY)

  const onSearchTermChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setSearchTerm(value)
      applySearchDebounced(value)
    },
    [applySearchDebounced],
  )

  const onSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const isEnterKey = event.keyCode === 13

      if (isEnterKey) {
        applySearch(searchTerm)
      }
    },
    [applySearch, searchTerm],
  )

  const clearFilter = useCallback(() => {
    setSearchTerm('')
    applyFilter('set', trait, [])
  }, [applyFilter, trait])

  return (
    <FormSectionStyled>
      <LabelStyled title={name}>
        <SearchInput
          type="search"
          placeholder={name}
          title={name}
          value={searchTerm}
          onChange={onSearchTermChange}
          onKeyDown={onSearchKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-gramm="false"
        />
        <FormSectionContent>
          {foundValues.map((value) => (
            <TreeFilterCheckbox key={value} text={value} trait={trait} value={value} />
          ))}
        </FormSectionContent>

        <ButtonClearFilter size="sm" onClick={clearFilter} disabled={!hasFilters}>
          {t('Clear')}
        </ButtonClearFilter>
      </LabelStyled>
    </FormSectionStyled>
  )
}
