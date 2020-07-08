import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { connect } from 'react-redux'
import { FaGithub, FaTwitter } from 'react-icons/fa'

import { State } from 'src/state/reducer'
import { selectPathname } from 'src/state/router/router.selectors'

import { Link } from 'src/components/Link/Link'
import { LinkExternal } from 'src/components/Link/LinkExternal'

import { ReactComponent as BrandLogo } from 'src/assets/img/nextstrain_logo.svg'

import { LanguageSwitcher } from './LanguageSwitcher'
import { NavigationLogo } from './NavigationLogo'

export interface NavigationBarProps {
  pathname: string
}

const mapStateToProps = (state: State) => ({
  pathname: selectPathname(state),
})

const mapDispatchToProps = {}

export const NavigationBar = connect(mapStateToProps, mapDispatchToProps)(NavigationBarDisconnected)

export function NavigationBarDisconnected({ pathname }: NavigationBarProps) {
  const { t } = useTranslation()

  const navLinksRight = useMemo(
    () => [
      {
        title: t('Twitter'),
        url: 'https://twitter.com/nextstrain',
        alt: t('Link to our Twitter'),
        icon: <FaTwitter size={28} color="#aaa" />,
      },
      {
        title: t('GitHub'),
        url: 'https://github.com/neherlab/webclades',
        alt: t('Link to our Github page'),
        icon: <FaGithub size={28} color="#aaa" />,
      },
    ],
    [t],
  )

  return (
    <nav
      className="navbar navbar-expand navbar-light navbar-scroll hide-native-scrollbar"
      role="navigation"
      data-testid="NavigationBar"
    >
      <Link className="navbar-brand d-flex" href="/" role="button">
        <BrandLogo className="navigation-bar-product-logo" />
        <NavigationLogo />
      </Link>

      <ul className="navbar-nav ml-auto d-flex">
        <li className="nav-item mx-2 my-auto">
          <LanguageSwitcher />
        </li>

        {navLinksRight.map(({ title, url, alt, icon }) => (
          <li key={title} className="nav-item mx-2 my-auto">
            <LinkExternal title={title} url={url} alt={alt}>
              {icon}
            </LinkExternal>
          </li>
        ))}
      </ul>
    </nav>
  )
}
