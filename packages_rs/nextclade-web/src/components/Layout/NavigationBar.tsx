import React, { useMemo } from 'react'

import { FaDocker, FaGithub, FaTwitter } from 'react-icons/fa'
import { IoMdBook } from 'react-icons/io'
import styled from 'styled-components'

import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

import { Link } from 'src/components/Link/Link'
import { LinkExternal } from 'src/components/Link/LinkExternal'

import BrandLogoBase from 'src/assets/img/nextclade_logo.svg'

import { CitationButton } from 'src/components/Citation/CitationButton'
import { WhatsNewButton } from './WhatsNewButton'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NavigationLogo } from './NavigationLogo'
import { SettingsButton } from './SettingsButton'

const BRAND_LOGO_SIZE = 36
const BRAND_LOGO_MARGIN = 10

export const BrandLogo = styled(BrandLogoBase)`
  width: ${BRAND_LOGO_SIZE}px;
  height: ${BRAND_LOGO_SIZE}px;
  margin-left: ${BRAND_LOGO_MARGIN}px;
  margin-right: ${BRAND_LOGO_MARGIN}px;
`

export const NavLinkContainer = styled.div`
  width: 50px;
  @media (min-width: 1200px) {
    width: 100px;
  }
`

export const NavLinkGrey = styled(LinkExternal)`
  color: inherit;
  text-decoration: none;
  cursor: pointer;

  &.active,
  &:active,
  &:hover,
  &:focus,
  &:focus-within {
    color: initial;
    text-decoration: none;
    cursor: pointer;
  }
`

export function DocsLink() {
  const { t } = useTranslationSafe()

  return (
    <NavLinkContainer className="text-center">
      <NavLinkGrey
        href="https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-web.html"
        alt={t('Documentation')}
        title={t('Documentation')}
      >
        <IoMdBook className="mr-xl-2" />
        <span className="d-none d-xl-inline">{t('Docs')}</span>
      </NavLinkGrey>
    </NavLinkContainer>
  )
}

export function NavigationBar() {
  const { t } = useTranslationSafe()

  const navLinksRight = useMemo(
    () => [
      {
        title: t('Twitter'),
        url: 'https://twitter.com/nextstrain',
        alt: t('Link to our Twitter'),
        icon: <FaTwitter size={28} color="#aaa" />,
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
        <BrandLogo />
        <NavigationLogo />
      </Link>

      <ul className="navbar-nav ml-auto d-flex">
        <li className="nav-item mx-2 my-auto">
          <CitationButton />
        </li>

        <li className="nav-item mx-2 my-auto">
          <DocsLink />
        </li>

        <li className="nav-item mx-2 my-auto">
          <SettingsButton />
        </li>

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
