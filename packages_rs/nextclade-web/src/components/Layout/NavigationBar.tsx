import React, { ReactNode, useMemo } from 'react'
import { useRouter } from 'next/router'
import {
  Nav as NavBase,
  Navbar as NavbarBase,
  NavbarBrand as NavbarBrandBase,
  NavItem as NavItemBase,
} from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { Link } from 'src/components/Link/Link'
import { FaDocker, FaGithub, FaTwitter } from 'react-icons/fa'
import { LinkSmart } from 'src/components/Link/LinkSmart'
import { hasRanAtom, hasTreeAtom } from 'src/state/results.state'
import styled from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import BrandLogoBase from 'src/assets/img/nextclade_logo.svg'
import { CitationButton } from 'src/components/Citation/CitationButton'
import { NextcladeTextLogo as NavigationLogoBase } from 'src/components/Layout/NextcladeTextLogo'
import { LanguageSwitcher } from './LanguageSwitcher'

const LOGO_SIZE = 30

export const Navbar = styled(NavbarBase)`
  display: flex;
  box-shadow: none !important;
  margin: 0;
  padding: 6px 10px;
`

export const Nav = styled(NavBase)``

export const NavItem = styled(NavItemBase)`
  padding: 0 0.5rem;
  flex-grow: 0;
  flex-shrink: 0;
`

const NavbarBrand = styled(NavbarBrandBase)`
  display: flex;
  padding: 0;
`

const BrandLogo = styled(BrandLogoBase)`
  width: ${LOGO_SIZE}px;
  height: ${LOGO_SIZE}px;
  margin: 0 1rem;
`

const NavigationLogo = styled(NavigationLogoBase)`
  margin: auto;
`

export const NavLinkLocalStyle = styled(LinkSmart)<{ $active: boolean; disabled?: boolean }>`
  color: ${({ $active, disabled, theme }) => (disabled ? theme.gray500 : $active ? theme.primary : theme.bodyColor)};
  font-weight: ${({ $active }) => $active && 'bold'};
  text-decoration: ${({ $active }) => $active && 'underline'};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`

export interface NavLinkDesc {
  url?: string
  content?: ReactNode
  title?: string
}

export interface NavLinkLocalProps {
  desc: NavLinkDesc
  active?: boolean
}

export function NavLinkImpl({ desc: { url, content, title }, active = false }: NavLinkLocalProps) {
  return (
    <NavItem key={url} title={title} aria-disabled={!url}>
      <NavLinkLocalStyle href={url} $active={active} aria-disabled={!url} disabled={!url}>
        {content}
      </NavLinkLocalStyle>
    </NavItem>
  )
}

export function NavigationBar() {
  const { t } = useTranslationSafe()
  const { pathname } = useRouter()

  const hasTree = useRecoilValue(hasTreeAtom)
  const hasRan = useRecoilValue(hasRanAtom)

  const linksLeft = useMemo(() => {
    return [
      { url: '/', content: t('Start'), title: t('Show start page') },
      {
        url: hasRan ? '/results' : undefined,
        content: t('Results'),
        title: hasRan ? t('Show analysis results table') : t('Please run the analysis first'),
      },
      {
        url: hasTree ? '/tree' : undefined,
        content: t('Tree'),
        title: hasTree ? t('Show phylogenetic tree') : t('Please run the analysis on a dataset with reference tree'),
      },
      {
        url: '/settings',
        content: t('Settings'),
        title: t('Configure Nextclade'),
      },
    ].map((desc) => {
      return <NavLinkImpl key={desc.url} desc={desc} active={pathname === desc.url} />
    })
  }, [hasRan, hasTree, pathname, t])

  const linksRight = useMemo(() => {
    return [
      {
        title: t('Cite Nextclade in your work'),
        content: <CitationButton />,
      },
      {
        url: 'https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-web.html',
        title: t('Nextclade documentation'),
        content: t('Docs'),
      },
      {
        url: 'https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-cli.html',
        title: t('Nextclade documentation'),
        content: t('CLI'),
      },
      {
        url: 'https://twitter.com/nextstrain',
        title: t('Link to our Twitter'),
        content: <FaTwitter size={20} color="#aaa" />,
      },
      {
        url: 'https://hub.docker.com/r/nextstrain/nextclade',
        title: t('Link to our Docker containers'),
        content: <FaDocker size={20} color="#aaa" />,
      },
      {
        url: 'https://github.com/nextstrain/nextclade',
        title: t('Link to our Github page'),
        content: <FaGithub size={20} color="#aaa" />,
      },
      {
        title: t('Change language'),
        content: <LanguageSwitcher />,
      },
    ].map((desc) => {
      return <NavLinkImpl key={desc.url} desc={desc} active={pathname === desc.url} />
    })
  }, [pathname, t])

  return (
    <Navbar light role="navigation">
      <Nav>
        <NavbarBrand tag={Link} href="/">
          <BrandLogo />
          <NavigationLogo />
        </NavbarBrand>

        {linksLeft}
      </Nav>
      <Nav className="ml-auto">{linksRight}</Nav>
    </Navbar>
  )
}
