import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'
import { MdArrowDropDown } from 'react-icons/md'
import {
  Dropdown as DropdownBase,
  DropdownToggle as DropdownToggleBase,
  DropdownMenu as DropdownMenuBase,
  DropdownItem as DropdownItemBase,
  DropdownProps,
  Badge,
} from 'reactstrap'
import { useToggle } from 'src/hooks/useToggle'
import { topSuggestedDatasetNamesAtom } from 'src/state/autodetect.state'
import { hasTreeAtom } from 'src/state/results.state'
import { attrStrMaybe, Dataset } from 'src/types'
import styled from 'styled-components'
import { useRecoilState, useRecoilValue } from 'recoil'
import { SearchBox } from 'src/components/Common/SearchBox'
import { search } from 'src/helpers/search'
import { TFunc, useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { datasetAtom, viewedDatasetNameAtom } from 'src/state/dataset.state'

export function ViewedDatasetSelector({ ...restProps }: DropdownProps) {
  const { t } = useTranslationSafe()

  const { state: isOpen, toggle } = useToggle(false)

  const [viewedDatasetName, setViewedDatasetName] = useRecoilState(viewedDatasetNameAtom)
  const datasetNames = useRecoilValue(topSuggestedDatasetNamesAtom)

  const [searchTerm, setSearchTerm] = useState('')
  const filtered = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return datasetNames
    }
    const { itemsStartWith, itemsInclude } = search(datasetNames, searchTerm, (datasetName) => [datasetName])
    return [...itemsStartWith, ...itemsInclude]
  }, [datasetNames, searchTerm])

  if (!viewedDatasetName) {
    return null
  }

  return (
    <Dropdown inNavbar nav direction="down" isOpen={isOpen} toggle={toggle} {...restProps}>
      <DropdownToggle nav>
        <LabelShort datasetName={viewedDatasetName} />
        <MdArrowDropDown className="ml-2 my-auto" />
      </DropdownToggle>
      <DropdownMenu>
        <SearchBoxWrapper>
          <SearchBox searchTitle={t('Search datasets')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
        </SearchBoxWrapper>
        <DropdownMenuListWrapper>
          {filtered.map((datasetName) => {
            const isCurrent = datasetName === viewedDatasetName
            return (
              <DropdownItem active={isCurrent} key={datasetName} onClick={() => setViewedDatasetName(datasetName)}>
                <LanguageSwitcherItem datasetName={datasetName} />
              </DropdownItem>
            )
          })}
        </DropdownMenuListWrapper>
      </DropdownMenu>
    </Dropdown>
  )
}

export function LanguageSwitcherItem({ datasetName }: { datasetName: string }) {
  return (
    <LanguageSwitcherItemWrapper title={datasetName}>
      <LabelShort datasetName={datasetName} />
    </LanguageSwitcherItemWrapper>
  )
}

export function LabelShort({ datasetName, ...restProps }: { datasetName: string }) {
  const { t } = useTranslationSafe()

  const { pathname } = useRouter()

  const isTreePage = pathname === '/tree'
  const hasTree = useRecoilValue(hasTreeAtom({ datasetName }))
  const dataset = useRecoilValue(datasetAtom({ datasetName }))
  const noTreeOrDisabled = isTreePage && !hasTree

  const { path, name, reference } = useMemo(() => {
    return getDatasetInfo(dataset, t)
  }, [dataset, t])

  return (
    <LabelShortText className="cursor-pointer" {...restProps}>
      <LabelTextMain>
        <span>{name}</span>
        {noTreeOrDisabled && (
          <Badge className="ml-1" color="secondary" size="sm">
            {t('no tree')}
          </Badge>
        )}
      </LabelTextMain>
      <LabelText className="small">{reference}</LabelText>
      <LabelText className="small">{path}</LabelText>
    </LabelShortText>
  )
}

export interface DatasetInfo {
  path: string
  name: string
  reference: string
}

export function getDatasetInfo(dataset: Dataset, t: TFunc): DatasetInfo {
  const { path, attributes } = dataset
  const name = attrStrMaybe(attributes, 'name') ?? t('Unknown')
  const referenceName = attrStrMaybe(attributes, 'reference name') ?? t('Unknown')
  const referenceAccession = attrStrMaybe(attributes, 'reference accession') ?? t('Unknown')
  const reference = `${referenceName} (${referenceAccession})`
  return { path, name, reference }
}

const LabelText = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const LabelTextMain = styled.div`
  font-size: 1rem;
  font-weight: bold;

  ${LabelText}
`

const LanguageSwitcherItemWrapper = styled.div`
  flex: 1;
  width: 100%;
`

const LabelShortText = styled.span`
  cursor: pointer;
`

const Dropdown = styled(DropdownBase)`
  display: block !important;
  margin: 0 !important;
`

const DropdownToggle = styled(DropdownToggleBase)`
  display: inline-flex !important;
  color: ${(props) => props.theme.bodyColor};
  padding: 0;
  margin: 0;
`

const DropdownMenu = styled(DropdownMenuBase)`
  position: absolute !important;
  right: 0 !important;
  top: 20px !important;

  background-color: ${(props) => props.theme.bodyBg};
  box-shadow: 1px 1px 20px 0 #0005;
  transition: opacity ease-out 0.25s;
  padding: 1rem;
  padding-right: 0;
  width: 320px;
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
  height: calc(80vh - 150px);
  min-height: 100px;
  overflow-y: scroll;
`
