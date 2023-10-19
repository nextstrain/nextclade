import React, { PropsWithChildren, useCallback, useMemo } from 'react'
import classnames from 'classnames'
import {
  Nav as NavBase,
  NavItem as NavItemBase,
  NavLink as NavLinkBase,
  TabPane as TabPaneBase,
  TabContent as TabContentBase,
  NavItemProps,
} from 'reactstrap'
import styled from 'styled-components'
import { Link } from 'src/components/Link/Link'

export function TabNav({ children }: PropsWithChildren<unknown>) {
  return <Nav tabs>{children}</Nav>
}

export interface TabLabelProps extends PropsWithChildren<NavItemProps> {
  tabId: string
  activeTabId: string
  setActiveTabId: (id: string) => void
}

export function TabLabel({ tabId, activeTabId, setActiveTabId, children, ...rest }: TabLabelProps) {
  const onClick = useCallback(() => setActiveTabId(tabId), [setActiveTabId, tabId])
  const active = activeTabId === tabId

  const more = useMemo(() => {
    if (rest.href) {
      return { tag: Link, replace: true }
    }
    return {}
  }, [rest.href])

  return (
    <NavItem className={classnames({ active })} {...rest} {...more}>
      <NavLink tag="nav" className={classnames({ active })} onClick={onClick}>
        {children}
      </NavLink>
    </NavItem>
  )
}

const Nav = styled(NavBase)`
  border-bottom: 0 !important;
`

export const TabContent = styled(TabContentBase)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  margin-top: -1px;
`

export const TabPane = styled(TabPaneBase)`
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
