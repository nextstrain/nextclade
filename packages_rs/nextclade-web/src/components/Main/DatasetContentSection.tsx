import classnames from 'classnames'
import React, { PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react'
import {
  Nav as NavBase,
  NavItem as NavItemBase,
  NavLink as NavLinkBase,
  TabPane,
  TabContent as TabContentBase,
  NavItemProps,
  TabPaneProps,
} from 'reactstrap'
import { MarkdownRemote } from 'src/components/Common/Markdown'
import styled from 'styled-components'

export interface DatasetContentSectionProps {
  readmeUrl: string
  changelogUrl: string
}

export function DatasetContentSection({ readmeUrl, changelogUrl }: DatasetContentSectionProps) {
  const [activeTabId, setActiveTabId] = useState(0)

  return (
    <ContentSection>
      <Nav tabs>
        <TabLabel tabId={0} activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
          {'README.md'}
        </TabLabel>
        <TabLabel tabId={1} activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
          {'CHANGELOG.md'}
        </TabLabel>
      </Nav>

      <TabContent activeTab={activeTabId}>
        <TabContentPane tabId={0} activeTabId={activeTabId}>
          <MarkdownRemote url={readmeUrl} />
        </TabContentPane>
        <TabContentPane tabId={1} activeTabId={activeTabId}>
          <MarkdownRemote url={changelogUrl} />
        </TabContentPane>
      </TabContent>
    </ContentSection>
  )
}

export interface TabProps extends PropsWithChildren<NavItemProps> {
  tabId: number
  activeTabId: number
  setActiveTabId: (id: number) => void
}

export function TabLabel({ tabId, activeTabId, setActiveTabId, children, ...rest }: TabProps) {
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

export interface TabContentPaneProps extends PropsWithChildren<TabPaneProps> {
  tabId: number
  activeTabId: number
}

export function TabContentPane({ tabId, activeTabId, children, ...rest }: TabContentPaneProps) {
  const active = activeTabId === tabId
  return (
    <LazyRender visible={active}>
      <TabPane tabId={0} {...rest}>
        {children}
      </TabPane>
    </LazyRender>
  )
}

export interface LazyProps {
  visible: boolean
}

export function LazyRender({ visible, children }: PropsWithChildren<LazyProps>) {
  const rendered = useRef(visible)
  const style = useMemo(() => ({ display: visible ? 'block' : 'none' }), [visible])
  if (visible && !rendered.current) {
    rendered.current = true
  }
  if (!rendered.current) return null
  return <div style={style}>{children}</div>
}

const ContentSection = styled.div`
  max-width: 100%;
`

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
`

const TabContent = styled(TabContentBase)`
  border: #ddd 1px solid;
  margin-top: -1px;
`
