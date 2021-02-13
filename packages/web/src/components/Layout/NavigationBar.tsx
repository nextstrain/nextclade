import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { connect } from 'react-redux'
import { FaDocker, FaGithub, FaNpm, FaTwitter } from 'react-icons/fa'

import { State } from 'src/state/reducer'
import { selectPathname } from 'src/state/router/router.selectors'

import { Link } from 'src/components/Link/Link'
import { LinkExternal } from 'src/components/Link/LinkExternal'

import { ReactComponent as BrandLogo } from 'src/assets/img/nextstrain_logo.svg'

import { WhatsNewButton } from './WhatsNewButton'
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
        title: t('Our NPM packages'),
        url: 'https://www.npmjs.com/package/@nextstrain/nextclade',
        alt: t('Link to our NPM package'),
        icon: <FaNpm size={28} color="#aaa" />,
      },
      {
        title: t('Our containers at Docker Hub'),
        url: 'https://hub.docker.com/r/nextstrain/nextclade',
        alt: t('Link to our Docker containers'),
        icon: <FaDocker size={28} color="#aaa" />,
      },
      {
        title: t('GitHub'),
        url: 'https://github.com/nextstrain/nextclade',
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
          <WhatsNewButton />
        </li>

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
