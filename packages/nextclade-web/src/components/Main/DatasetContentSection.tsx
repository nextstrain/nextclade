import classnames from 'classnames'
import React, { PropsWithChildren, useCallback, useState } from 'react'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import styled from 'styled-components'
import {
  Nav as NavBase,
  NavItem as NavItemBase,
  NavLink as NavLinkBase,
  TabPane as TabPaneBase,
  TabContent as TabContentBase,
  NavItemProps,
} from 'reactstrap'
import { useRecoilValue } from 'recoil'
import { MarkdownRemote } from 'src/components/Common/Markdown'
import { datasetCurrentAtom } from 'src/state/dataset.state'
import { DatasetContentTabAdvanced } from 'src/components/Main/DatasetContentTabAdvanced'
import { DatasetCustomizationIndicator } from 'src/components/Main/DatasetCustomizationIndicator'

export function DatasetContentSection() {
  const { t } = useTranslationSafe()
  const [activeTabId, setActiveTabId] = useState(0)
  const currentDataset = useRecoilValue(datasetCurrentAtom)
  return (
    <ContentSection>
      <Nav tabs>
        {currentDataset?.files?.readme && (
          <TabLabel tabId={0} activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
            {t('Summary')}
          </TabLabel>
        )}
        {currentDataset?.files?.changelog && (
          <TabLabel tabId={1} activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
            {t('History')}
          </TabLabel>
        )}
        {currentDataset && (
          <TabLabel tabId={2} activeTabId={activeTabId} setActiveTabId={setActiveTabId}>
            {t('Customize')}
            <DatasetCustomizationIndicator />
          </TabLabel>
        )}
      </Nav>
      <TabContent activeTab={activeTabId}>
        <TabPane tabId={0}>
          {currentDataset?.files?.readme && <MarkdownRemote url={currentDataset?.files.readme} />}
        </TabPane>
        <TabPane tabId={1}>
          {currentDataset?.files?.changelog && <MarkdownRemote url={currentDataset?.files.changelog} />}
        </TabPane>
        <TabPane tabId={2}>{currentDataset && <DatasetContentTabAdvanced />}</TabPane>
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

const ContentSection = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

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
  display: flex;

  cursor: pointer;

  border: #ccc 1px solid;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;

  background: #ddd;
  min-width: 170px;

  border-bottom: 0 !important;

  z-index: 2;

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
  flex: 1;
  display: flex;
  color: ${(props) => props.theme.bodyColor};
`
