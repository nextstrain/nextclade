import React, { ReactNode, useCallback, useState } from 'react'

import type { StrictOmit } from 'ts-essentials'
import {
  Nav as NavBase,
  NavItem,
  NavItemProps,
  NavLink,
  NavProps,
  TabContent as TabContentBase,
  TabPane as TabPaneBase,
} from 'reactstrap'
import styled from 'styled-components'

const TabsPanelContainer = styled.div`
  flex: 1;
`

const TabContent = styled(TabContentBase)`
  height: 100%;
`

const TabPane = styled(TabPaneBase)`
  height: 100%;
`

const Nav = styled(NavBase)`
  cursor: pointer;
`

export interface TabDesc {
  name: string
  title: ReactNode
  body?: ReactNode
}

export interface TabsProps {
  tabs: TabDesc[]
}

export function TabsLight({ tabs }: TabsProps) {
  const [activeTab, setActiveTab] = useState<string>('file')

  return (
    <TabsPanelContainer>
      <TabsPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <TabsContent tabs={tabs} activeTab={activeTab} />
    </TabsPanelContainer>
  )
}

export interface TabComponentProps extends StrictOmit<NavItemProps, 'onChange'> {
  tab: TabDesc
  activeTab: string
  disabled?: boolean
  onChange(tabName: string): void
}

export function TabComponent({ tab, activeTab, onChange, disabled, ...props }: TabComponentProps) {
  const onClick = useCallback(() => {
    if (activeTab !== tab.name) {
      onChange(tab.name)
    }
  }, [activeTab, onChange, tab.name])

  return (
    <NavItem>
      <NavLink active={!disabled && activeTab === tab.name} onClick={onClick} disabled={disabled} {...props}>
        {tab.title}
      </NavLink>
    </NavItem>
  )
}

export interface TabsPanelProps extends StrictOmit<NavProps, 'tabs'> {
  tabs: TabDesc[]
  activeTab: string
  disabled?: boolean
  onChange(tabName: string): void
}

export function TabsPanel({ tabs, activeTab, onChange, disabled, ...restProps }: TabsPanelProps) {
  return (
    <Nav tabs {...restProps}>
      {tabs.map((tab) => (
        <TabComponent key={tab.name} tab={tab} activeTab={activeTab} onChange={onChange} disabled={disabled} />
      ))}
    </Nav>
  )
}

export interface TabsContentProps {
  tabs: TabDesc[]
  activeTab: string
}

export function TabsContent({ tabs, activeTab, ...props }: TabsContentProps) {
  return (
    <TabContent activeTab={activeTab} {...props}>
      {tabs.map((tab) => (
        <TabPane tabId={tab.name} key={tab.name}>
          {tab.body}
        </TabPane>
      ))}
    </TabContent>
  )
}
