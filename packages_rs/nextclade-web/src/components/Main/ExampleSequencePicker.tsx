import { Dataset } from '_SchemaRoot'
import React, { useCallback, useMemo, useState } from 'react'
import {
  Dropdown as DropdownBase,
  DropdownToggle as DropdownToggleBase,
  DropdownMenu as DropdownMenuBase,
  DropdownItem as DropdownItemBase,
  DropdownProps,
} from 'reactstrap'
import { attrStrMaybe } from 'src/types'
import styled from 'styled-components'
import { useRecoilValue } from 'recoil'
import { SearchBox } from 'src/components/Common/SearchBox'
import { search } from 'src/helpers/search'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetsAtom } from 'src/state/dataset.state'
import { useQuerySeqInputs } from 'src/state/inputs.state'
import { AlgorithmInputDefault } from 'src/io/AlgorithmInput'

export type LanguageSwitcherProps = DropdownProps

export function ExampleSequencePicker({ ...restProps }: LanguageSwitcherProps) {
  const { t } = useTranslationSafe()
  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = useCallback(() => {
    setDropdownOpen((prevState) => !prevState)
  }, [])
  const { datasets } = useRecoilValue(datasetsAtom)
  const { addQryInputs } = useQuerySeqInputs()

  const filtered = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return datasets
    }
    const { itemsStartWith, itemsInclude } = search(datasets, searchTerm, (dataset) => [
      dataset.path,
      attrStrMaybe(dataset.attributes, 'name') ?? '',
      attrStrMaybe(dataset.attributes, 'reference name') ?? '',
      attrStrMaybe(dataset.attributes, 'reference accession') ?? '',
      dataset.path,
    ])
    return [...itemsStartWith, ...itemsInclude]
  }, [datasets, searchTerm])

  const onClick = useCallback(
    (dataset: Dataset) => () => {
      addQryInputs([new AlgorithmInputDefault(dataset)])
    },
    [addQryInputs],
  )

  return (
    <Dropdown isOpen={dropdownOpen} toggle={toggle} {...restProps}>
      <DropdownToggle nav caret>
        {t('Example')}
      </DropdownToggle>
      <DropdownMenu container="body">
        <SearchBoxWrapper>
          <SearchBox searchTitle={t('Search examples')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
        </SearchBoxWrapper>
        <DropdownMenuListWrapper>
          {filtered.map((dataset) => {
            return (
              <DropdownItem key={dataset.path} onClick={onClick(dataset)}>
                {dataset.path}
              </DropdownItem>
            )
          })}
        </DropdownMenuListWrapper>
      </DropdownMenu>
    </Dropdown>
  )
}

const Dropdown = styled(DropdownBase)`
  padding: 8px 16px !important;
  border: 0;
  box-shadow: inset 0 -1px 0 #ddd;
  margin-bottom: 1px;
`

const DropdownToggle = styled(DropdownToggleBase)`
  color: ${(props) => props.theme.bodyColor};
  padding: 0;
  margin: 0;
`

const DropdownMenu = styled(DropdownMenuBase)`
  position: absolute !important;
  background-color: ${(props) => props.theme.bodyBg};
  box-shadow: 1px 1px 20px 0 #0005;
  transition: opacity ease-out 0.25s;
  padding: 1rem;
  min-width: 275px;
  z-index: 10000;
`

const DropdownItem = styled(DropdownItemBase)`
  width: 100% !important;
  padding: 0 !important;
`

const SearchBoxWrapper = styled.div`
  margin-bottom: 0.5rem;
  margin-right: 1rem;
`

const DropdownMenuListWrapper = styled.div`
  max-height: 50vh;
  overflow-y: auto;
`
