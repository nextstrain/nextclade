import React, { useCallback, useMemo, useState } from 'react'
import {
  Dropdown as DropdownBase,
  DropdownToggle as DropdownToggleBase,
  DropdownMenu as DropdownMenuBase,
  DropdownItem as DropdownItemBase,
  DropdownProps,
} from 'reactstrap'
import { useRecoilState } from 'recoil'
import { SearchBox } from 'src/components/Common/SearchBox'
import { search } from 'src/helpers/search'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import { localeAtom } from 'src/state/locale.state'
import { getLocaleWithKey, Locale, localesArray } from 'src/i18n/i18n'

export type LanguageSwitcherProps = DropdownProps

export function LanguageSwitcher({ ...restProps }: LanguageSwitcherProps) {
  const { t } = useTranslationSafe()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentLocale, setCurrentLocale] = useRecoilState(localeAtom)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = useCallback(() => setDropdownOpen((prevState) => !prevState), [])
  const setLocaleLocal = useCallback((locale: Locale) => () => setCurrentLocale(locale.key), [setCurrentLocale])

  const localesFiltered = useMemo(() => {
    if (searchTerm.trim().length === 0) {
      return localesArray
    }
    const { itemsStartWith, itemsInclude } = search(localesArray, searchTerm, (locale) => [
      locale.name,
      locale.native,
      locale.key,
    ])
    return [...itemsStartWith, ...itemsInclude]
  }, [searchTerm])

  return (
    <Dropdown inNavbar nav direction="left" isOpen={dropdownOpen} toggle={toggle} {...restProps}>
      <DropdownToggle nav>
        <LabelShort locale={currentLocale} />
      </DropdownToggle>
      <DropdownMenu>
        <SearchBoxWrapper>
          <SearchBox searchTitle={t('Search languages')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} />
        </SearchBoxWrapper>
        <DropdownMenuListWrapper>
          {localesFiltered.map((locale) => {
            const isCurrent = locale.key === currentLocale
            return (
              <DropdownItem active={isCurrent} key={locale.key} onClick={setLocaleLocal(locale)}>
                <LanguageSwitcherItem locale={locale.key} />
              </DropdownItem>
            )
          })}
        </DropdownMenuListWrapper>
      </DropdownMenu>
    </Dropdown>
  )
}

export function LanguageSwitcherItem({ locale }: { locale: string }) {
  const { name, native } = getLocaleWithKey(locale)
  const { label, tooltip } = useMemo(() => {
    return { label: `(${native})`, tooltip: `${name} (${native})` }
  }, [name, native])
  return (
    <LanguageSwitcherItemWrapper title={tooltip}>
      <LabelShort locale={locale} />
      <span className="mx-2">{label}</span>
    </LanguageSwitcherItemWrapper>
  )
}

export function LabelShort({ locale, ...restProps }: { locale: string; className?: string }) {
  const { key } = getLocaleWithKey(locale)
  const { t } = useTranslationSafe()
  return (
    <LabelShortText title={t('Change language')} {...restProps}>
      {key}
    </LabelShortText>
  )
}

const LanguageSwitcherItemWrapper = styled.div`
  flex: 1;
  width: 100%;
`

const LabelShortText = styled.span`
  font-family: ${(props) => props.theme.font.monospace};
  text-transform: uppercase !important;
  color: unset !important;
`

const Dropdown = styled(DropdownBase)`
  display: block !important;
  margin: 0 !important;
`

const DropdownToggle = styled(DropdownToggleBase)`
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
  width: 275px;
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
