/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useState } from 'react'
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, DropdownProps } from 'reactstrap'
import { useRecoilState } from 'recoil'

import { localeAtom } from 'src/state/locale.state'
import { Locale, localesArray } from 'src/i18n/i18n'

export type LanguageSwitcherProps = DropdownProps

export function LanguageSwitcher({ ...restProps }: LanguageSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useRecoilState(localeAtom)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = useCallback(() => setDropdownOpen((prevState) => !prevState), [])
  const setLocaleLocal = useCallback((locale: Locale) => () => setCurrentLocale(locale), [setCurrentLocale])

  return (
    <Dropdown className="language-switcher" isOpen={dropdownOpen} toggle={toggle} {...restProps}>
      <DropdownToggle nav caret>
        <LanguageSwitcherItem locale={currentLocale} />
      </DropdownToggle>
      <DropdownMenu className="language-switcher-menu" positionFixed>
        {localesArray.map((locale) => {
          const isCurrent = locale.key === currentLocale.key
          return (
            <DropdownItem active={isCurrent} key={locale.key} onClick={setLocaleLocal(locale)}>
              <LanguageSwitcherItem locale={locale} />
            </DropdownItem>
          )
        })}
      </DropdownMenu>
    </Dropdown>
  )
}

export function LanguageSwitcherItem({ locale }: { locale: Locale }) {
  const { flagIconUrl, name } = locale
  return (
    <>
      <img src={flagIconUrl} alt={name} className="language-switcher-flag" />
      <span className="pl-2">{name}</span>
    </>
  )
}
