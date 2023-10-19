import React, { PropsWithChildren, useCallback, useState } from 'react'
import { useRouter } from 'next/router'
import classnames from 'classnames'
import {
  Button,
  ButtonProps,
  Nav as NavBase,
  NavItem as NavItemBase,
  NavLink as NavLinkBase,
  TabPane as TabPaneBase,
  TabContent as TabContentBase,
  NavItemProps,
} from 'reactstrap'
import styled from 'styled-components'
import { Link } from 'src/components/Link/Link'
import { Layout } from 'src/components/Layout/Layout'
import { SeqViewSettings } from 'src/components/Settings/SeqViewSettings'
import { SystemSettings } from 'src/components/Settings/SystemSettings'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export function SettingsPage() {
  const { t } = useTranslationSafe()
  const { back, asPath } = useRouter()
  const [activeTabId, setActiveTabId] = useState(asPath.split('#')[1] ?? 'general')

  return (
    <Layout>
      <Container>
        <Header>
          <h3>{t('Settings')}</h3>
        </Header>

        <Main>
          <Nav tabs>
            <TabLabel
              tag={Link}
              replace
              href="#general"
              tabId="general"
              activeTabId={activeTabId}
              setActiveTabId={setActiveTabId}
            >
              {t('General')}
            </TabLabel>
            <TabLabel
              tag={Link}
              replace
              href="#sequence-view"
              tabId="sequence-view"
              activeTabId={activeTabId}
              setActiveTabId={setActiveTabId}
            >
              {t('Sequence view')}
            </TabLabel>
          </Nav>
          <TabContent activeTab={activeTabId}>
            <TabPane tabId="general">
              <SystemSettings />
            </TabPane>
            <TabPane tabId="sequence-view">
              <SeqViewSettings />
            </TabPane>
          </TabContent>
        </Main>

        <Footer>
          <ButtonOk className="m-2 ml-auto" type="button" color="success" onClick={back}>
            {t('OK')}
          </ButtonOk>
        </Footer>
      </Container>
    </Layout>
  )
}

interface TabLabelProps extends PropsWithChildren<NavItemProps> {
  tabId: string
  activeTabId: string
  setActiveTabId: (id: string) => void
}

function TabLabel({ tabId, activeTabId, setActiveTabId, children, ...rest }: TabLabelProps) {
  const onClick = useCallback(() => setActiveTabId(tabId), [setActiveTabId, tabId])
  const active = activeTabId === tabId
  return (
    <NavItem className={classnames({ active })} {...rest}>
      <NavLink tag="nav" className={classnames({ active })} onClick={onClick}>
        {children}
      </NavLink>
    </NavItem>
  )
}

const TabContent = styled(TabContentBase)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  margin-top: -1px;
`

const TabPane = styled(TabPaneBase)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;

  border: 1px #ccc9 solid;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  border-top-right-radius: 5px;

  padding: 1rem;
`

export interface LazyProps {
  visible: boolean
}

const Nav = styled(NavBase)`
  border-bottom: 0 !important;
`

const NavItem = styled(NavItemBase)`
  cursor: pointer;

  border: #ccc 1px solid;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;

  background: #ddd;
  min-width: 170px;

  border-bottom: 0 !important;

  margin-right: 0.25rem;
  z-index: 2;

  text-decoration: none !important;

  .active {
    font-weight: bold;
    background-color: ${(props) => props.theme.white} !important;
  }

  .nav-link,
  .nav-link:focus {
    box-shadow: none !important;

    &:hover {
      box-shadow: none !important;
    }
  }

  .nav-link.active,
  .nav-link.active:focus {
    box-shadow: none !important;
  }

  .nav-link.disabled {
    box-shadow: none !important;
  }
`

const NavLink = styled(NavLinkBase)`
  color: ${(props) => props.theme.bodyColor};
  text-align: center;
`

const Container = styled.div`
  max-width: ${(props) => props.theme.containerMaxWidths.md};
  margin: 0 auto;
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  flex: 0;
  padding-left: 10px;
  margin-top: 10px;
  margin-bottom: 3px;
`

const Main = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
`

const Footer = styled.div`
  display: flex;
  flex: 0;
`

const ButtonOk = styled(Button)<ButtonProps>`
  width: 100px;
`
