import React, { useCallback, useMemo, useState } from 'react'
import {
  Dropdown as DropdownBase,
  DropdownToggle as DropdownToggleBase,
  DropdownMenu as DropdownMenuBase,
  DropdownItem,
  DropdownProps,
} from 'reactstrap'
import { useRecoilState } from 'recoil'
import styled from 'styled-components'
import { localeAtom } from 'src/state/locale.state'
import { getLocaleWithKey, Locale, localesArray } from 'src/i18n/i18n'

export type LanguageSwitcherProps = DropdownProps

export function LanguageSwitcher({ ...restProps }: LanguageSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useRecoilState(localeAtom)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = useCallback(() => setDropdownOpen((prevState) => !prevState), [])
  const setLocaleLocal = useCallback((locale: Locale) => () => setCurrentLocale(locale.key), [setCurrentLocale])

  return (
    <Dropdown isOpen={dropdownOpen} toggle={toggle} {...restProps}>
      <DropdownToggle nav caret>
        <LabelShort locale={currentLocale} />
      </DropdownToggle>
      <DropdownMenu positionFixed>
        {localesArray.map((locale) => {
          const isCurrent = locale.key === currentLocale
          return (
            <DropdownItem active={isCurrent} key={locale.key} onClick={setLocaleLocal(locale)}>
              <LanguageSwitcherItem locale={locale.key} />
            </DropdownItem>
          )
        })}
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
    <span title={tooltip}>
      <LabelShort locale={locale} />
      <span className="mx-2">{label}</span>
    </span>
  )
}

export function LabelShort({ locale, ...restProps }: { locale: string; className?: string }) {
  const { key } = getLocaleWithKey(locale)
  return <LabelShortText {...restProps}>{key}</LabelShortText>
}

const LabelShortText = styled.span`
  font-family: ${(props) => props.theme.font.monospace};
  text-transform: uppercase !important;
  color: unset !important;
`

const Dropdown = styled(DropdownBase)`
  padding: 0;
  margin: 0;
`

const DropdownToggle = styled(DropdownToggleBase)`
  color: ${(props) => props.theme.bodyColor};
  padding: 0;
  margin: 0;
`

const DropdownMenu = styled(DropdownMenuBase)`
  background-color: ${(props) => props.theme.bodyBg};
  box-shadow: 1px 1px 20px 0 #0005;
  transition: opacity ease-out 0.25s;
`
