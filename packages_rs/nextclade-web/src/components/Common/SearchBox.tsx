import React, { ChangeEvent, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Form, Input as InputBase } from 'reactstrap'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { MdSearch as IconSearchBase, MdClear as IconClearBase } from 'react-icons/md'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'

const SearchForm = styled(Form)`
  display: inline;
  position: relative;
`

const IconSearchWrapper = styled.span`
  display: inline;
  position: absolute;
  padding: 7px 10px;
`

const IconSearch = styled(IconSearchBase)`
  * {
    color: ${(props) => props.theme.gray500};
  }
`

const ButtonClear = styled(ButtonTransparent)`
  display: inline;
  position: absolute;
  right: 0;
  padding: 4px 7px;
`

const IconClear = styled(IconClearBase)`
  * {
    color: ${(props) => props.theme.gray500};
  }
`

const Input = styled(InputBase)`
  display: inline !important;
  padding-left: 38px;
`

export interface SearchBoxProps {
  searchTitle?: string
  searchTerm: string
  onSearchTermChange(term: string): void
}

export function SearchBox({ searchTitle, searchTerm, onSearchTermChange }: SearchBoxProps) {
  const { t } = useTranslationSafe()

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onSearchTermChange(event.target.value)
    },
    [onSearchTermChange],
  )

  const onClear = useCallback(() => {
    onSearchTermChange('')
  }, [onSearchTermChange])

  const buttonClear = useMemo(() => {
    if (searchTerm.length === 0) {
      return null
    }
    return (
      <ButtonClear onClick={onClear} title={t('Clear')}>
        <IconClear size={25} />
      </ButtonClear>
    )
  }, [onClear, searchTerm.length, t])

  return (
    <SearchForm>
      <IconSearchWrapper>
        <IconSearch size={25} />
      </IconSearchWrapper>
      <Input
        type="text"
        title={searchTitle}
        placeholder={searchTitle}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-gramm="false"
        value={searchTerm}
        onChange={onChange}
      />
      {buttonClear}
    </SearchForm>
  )
}
