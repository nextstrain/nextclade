import React, { ReactNode, useMemo } from 'react'
import { useRouter } from 'next/router'
import {
  Nav as NavBase,
  Navbar as NavbarBase,
  NavbarBrand as NavbarBrandBase,
  NavItem as NavItemBase,
} from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { BsCaretRightFill as ArrowRight } from 'react-icons/bs'
import { Link } from 'src/components/Link/Link'
import { FaDocker, FaGithub, FaXTwitter, FaDiscourse } from 'react-icons/fa6'
import { LinkSmart } from 'src/components/Link/LinkSmart'
import { isInSuggestModeAtom } from 'src/state/autodetect.state'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { ResultsStatus } from 'src/components/Results/ResultsStatus'
import { canDownloadAtom, hasRanAtom, hasTreeAtom } from 'src/state/results.state'
import styled, { useTheme } from 'styled-components'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import BrandLogoBase from 'src/assets/img/nextclade_logo.svg'
import { CitationButton } from 'src/components/Citation/CitationButton'
import { NextcladeTextLogo } from 'src/components/Layout/NextcladeTextLogo'
import { LanguageSwitcher } from './LanguageSwitcher'

const LOGO_SIZE = 36

export const Navbar = styled(NavbarBase)`
  height: 45px;
  display: flex;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: 0 0 8px 0 #0004;
`

export const Nav = styled(NavBase)`
  display: flex;
  padding: 0 !important;
  margin: 0 !important;
`

const NavbarBrand = styled(NavbarBrandBase)`
  display: flex;
  flex: 1;
  padding: 0 !important;
  margin: 0 !important;
`

const BrandLogo = styled(BrandLogoBase)`
  width: ${LOGO_SIZE}px;
  height: ${LOGO_SIZE}px;
  padding: 0 !important;
  margin-left: 0.5rem;
`

const BrandText = styled(NextcladeTextLogo)`
  margin-left: 1rem;
  margin-right: 1rem;
`

export const NavItem = styled(NavItemBase)`
  margin: auto;
`

export const NavLinkLocalStyle = styled(LinkSmart)<{ $active: boolean; disabled?: boolean }>`
  padding: 0 0.5rem;
  color: ${({ $active, disabled, theme }) => (disabled ? theme.gray500 : $active ? theme.primary : theme.bodyColor)};
  font-weight: ${({ $active }) => $active && 'bold'};
  text-decoration: ${({ $active }) => $active && 'underline'};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`

export const NavItemBreadcrumb = styled(NavItem)<{ $active: boolean; disabled?: boolean }>`
  min-width: 90px;
  padding: 3px 0;
  background: ${(props) =>
    props.$active ? props.theme.primary : props.disabled ? props.theme.gray250 : props.theme.gray150};
  text-align: center;
  border: #0001 solid 1px;
  border-radius: 3px;
`

export const NavLinkBreadcrumbStyle = styled(NavLinkLocalStyle)<{ $active: boolean; disabled?: boolean }>`
  text-decoration: none !important;
  color: ${({ $active, disabled, theme }) => (disabled ? theme.gray500 : $active ? theme.white : theme.bodyColor)};

  :hover {
    color: ${({ $active, disabled, theme }) => (disabled ? theme.gray500 : $active ? theme.white : theme.bodyColor)};
  }
`

export interface NavLinkDesc {
  url?: string
  content?: ReactNode
  component?: ReactNode
  title?: string
}

export interface NavLinkLocalProps {
  desc: NavLinkDesc
  active?: boolean
}

export function NavLinkImpl({ desc: { url, content, component, title }, active = false }: NavLinkLocalProps) {
  const item = useMemo(() => {
    if (component) {
      return component
    }
    return (
      <NavLinkLocalStyle href={url} $active={active} aria-disabled={!url} disabled={!url}>
        {content}
      </NavLinkLocalStyle>
    )
  }, [active, component, content, url])

  return (
    <NavItem key={url} title={title} aria-disabled={!url}>
      {item}
    </NavItem>
  )
}

export function NavLinkBreadcrumb({ desc: { url, content, title }, active = false }: NavLinkLocalProps) {
  return (
    <NavItemBreadcrumb key={url} title={title} $active={active} aria-disabled={!url} disabled={!url}>
      <NavLinkBreadcrumbStyle href={url} $active={active} aria-disabled={!url} disabled={!url}>
        {content}
      </NavLinkBreadcrumbStyle>
    </NavItemBreadcrumb>
  )
}

export function NavigationBar() {
  const { t } = useTranslationSafe()
  const { pathname } = useRouter()

  const hasTree = useRecoilValue(hasTreeAtom)
  const hasRan = useRecoilValue(hasRanAtom)
  const isInSuggestMode = useRecoilValue(isInSuggestModeAtom)
  const dataset = useRecoilValue(datasetCurrentAtom)
  const canDownload = useRecoilValue(canDownloadAtom)

  const linksLeft = useMemo(() => {
    return [
      { url: '/', content: t('Start'), title: t('Show start page') },
      {
        url: '/dataset-suggest',
        content: t('Suggest'),
        title: t('Show dataset suggestion page'),
        hidden: !isInSuggestMode,
      },
      {
        url: dataset ? '/dataset' : undefined,
        content: t('Dataset'),
        title: dataset ? t('Show dataset selection page') : t('Please select dataset first'),
      },
      {
        url: hasRan ? '/results' : undefined,
        content: t('Results'),
        title: hasRan ? t('Show analysis results table') : t('Please select a dataset and run the analysis first'),
      },
      {
        url: hasTree ? '/tree' : undefined,
        content: t('Tree'),
        title: hasTree
          ? t('Show phylogenetic tree')
          : t('Please select a dataset with reference tree and run the analysis first'),
      },
      {
        url: canDownload ? '/export' : undefined,
        content: t('Export'),
        title: canDownload ? t('Export results') : t('Please run the analysis first.'),
      },
    ].map((desc, i) => {
      if (desc.hidden) {
        return null
      }
      const link = <NavLinkBreadcrumb key={desc.url ?? desc.title} desc={desc} active={pathname === desc.url} />
      if (i === 0) {
        return [link]
      }
      const arrow = <BreadcrumbArrow key={`arrow-${desc.url ?? desc.title}`} disabled={!desc.url} />
      return [arrow, link]
    })
  }, [canDownload, dataset, hasRan, hasTree, isInSuggestMode, pathname, t])

  const linksRight = useMemo(() => {
    return [
      {
        url: '/settings',
        content: t('Settings'),
        title: t('Configure Nextclade'),
      },
      {
        title: t('Cite Nextclade in your work'),
        content: <CitationButton />,
      },
      {
        url: 'https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-web.html',
        title: t('Nextclade Web documentation'),
        content: t('Docs'),
      },
      {
        url: 'https://docs.nextstrain.org/projects/nextclade/en/stable/user/nextclade-cli.html',
        title: t('Nextclade CLI documentation'),
        content: t('CLI'),
      },
      {
        url: 'https://twitter.com/nextstrain',
        title: t('Link to our X.com (Twitter)'),
        content: <FaXTwitter size={20} color="#aaa" className="mb-1" />,
      },
      {
        url: 'https://discussion.nextstrain.org/',
        title: t('Link to our discussion forum'),
        content: <FaDiscourse size={20} color="#aaa" className="mb-1" />,
      },
      {
        url: 'https://hub.docker.com/r/nextstrain/nextclade',
        title: t('Link to our Docker containers'),
        content: <FaDocker size={20} color="#aaa" className="mb-1" />,
      },
      {
        url: 'https://github.com/nextstrain/nextclade',
        title: t('Link to our GitHub page'),
        content: <FaGithub size={20} color="#aaa" className="mb-1" />,
      },
      {
        title: t('Change language'),
        component: <LanguageSwitcher className="px-2" />,
      },
    ].map((desc) => {
      return <NavLinkImpl key={desc.title} desc={desc} active={pathname === desc.url} />
    })
  }, [pathname, t])

  return (
    <Navbar light role="navigation">
      <Nav>
        <NavbarBrand tag={Link} href="/">
          <BrandLogo />
          <BrandText />
        </NavbarBrand>

        {linksLeft}
      </Nav>

      <ResultsStatus />

      <Nav className="ml-auto">{linksRight}</Nav>
    </Navbar>
  )
}

export function BreadcrumbArrow({ disabled }: { disabled?: boolean }) {
  const theme = useTheme()
  const color = disabled ? theme.gray500 : theme.bodyColor
  return <BreadCrumbArrowIcon size={15} $color={color} />
}

const BreadCrumbArrowIcon = styled(ArrowRight)<{ $color?: string }>`
  margin: auto 0;
  stroke: ${(props) => props.$color};
  fill: ${(props) => props.$color};
`
