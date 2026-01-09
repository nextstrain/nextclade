import React, { useState, useCallback, useEffect } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import { createStore as jotaiCreateStore } from 'jotai'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import 'jotai-devtools/styles.css'

type DevToolsTab = 'jotai' | 'react-query'

interface DevToolsDrawerProps {
  jotaiStore: ReturnType<typeof jotaiCreateStore>
}

function JotaiDevToolsInner({ store }: { store: ReturnType<typeof jotaiCreateStore> }) {
  const { DevTools } = require('jotai-devtools') // eslint-disable-line global-require, @typescript-eslint/no-require-imports
  return <DevTools store={store} isInitialOpen />
}

export function DevToolsDrawer({ jotaiStore }: DevToolsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DevToolsTab>('jotai')

  const toggleDrawer = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const selectTab = useCallback(
    (tab: DevToolsTab) => {
      if (tab === activeTab && isOpen) {
        setIsOpen(false)
      } else {
        setActiveTab(tab)
        setIsOpen(true)
      }
    },
    [activeTab, isOpen],
  )

  useEffect(() => {
    document.body.setAttribute('data-devtools-open', String(isOpen))
    document.body.setAttribute('data-devtools-tab', activeTab)
    return () => {
      document.body.removeAttribute('data-devtools-open')
      document.body.removeAttribute('data-devtools-tab')
    }
  }, [isOpen, activeTab])

  const handleSelectJotai = useCallback(() => selectTab('jotai'), [selectTab])
  const handleSelectReactQuery = useCallback(() => selectTab('react-query'), [selectTab])

  return (
    <>
      <GlobalDevToolsStyles />

      <JotaiDevToolsInner store={jotaiStore} />
      <ReactQueryDevtools initialIsOpen />

      <DrawerWrapper>
        <TabBar>
          <Tab $isActive={activeTab === 'jotai' && isOpen} onClick={handleSelectJotai} title="Jotai DevTools">
            Jotai
          </Tab>
          <Tab
            $isActive={activeTab === 'react-query' && isOpen}
            onClick={handleSelectReactQuery}
            title="React Query DevTools"
          >
            Query
          </Tab>
          <ToggleButton onClick={toggleDrawer} title="Toggle DevTools drawer">
            {isOpen ? '\u25BC' : '\u25B2'}
          </ToggleButton>
        </TabBar>
      </DrawerWrapper>
    </>
  )
}

const GlobalDevToolsStyles = createGlobalStyle`
  /* Hide Jotai DevTools trigger button always */
  #jotai-devtools-root > button {
    display: none !important;
  }

  /* Hide React Query DevTools trigger button always */
  .tsqd-parent-container > button {
    display: none !important;
  }

  /* Hide React Query DevTools close button */
  button[aria-label='Close tanstack query devtools'] {
    display: none !important;
  }

  /* Base state for Jotai panel - hidden below viewport */
  #jotai-devtools-root > div {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    width: 100% !important;
    height: calc(50vh - 32px) !important;
    max-height: calc(50vh - 32px) !important;
    z-index: 99997 !important;
    border-radius: 0 !important;
    transform: translateY(100%) !important;
    transition: transform 0.3s ease, visibility 0s 0.3s !important;
    visibility: hidden;
  }

  /* Base state for React Query panel - hidden below viewport */
  aside[aria-label='Tanstack query devtools'] {
    position: fixed !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    top: auto !important;
    width: 100% !important;
    height: calc(50vh - 32px) !important;
    max-height: calc(50vh - 32px) !important;
    z-index: 99997 !important;
    border-radius: 0 !important;
    transform: translateY(100%) !important;
    transition: transform 0.3s ease, visibility 0s 0.3s !important;
    visibility: hidden;
  }

  /* When drawer is open, both panels slide up */
  body[data-devtools-open='true'] #jotai-devtools-root > div,
  body[data-devtools-open='true'] aside[aria-label='Tanstack query devtools'] {
    transform: translateY(0) !important;
    transition: transform 0.3s ease, visibility 0s 0s !important;
  }

  /* Show only the active panel (instant switch via visibility) */
  body[data-devtools-open='true'][data-devtools-tab='jotai'] #jotai-devtools-root > div {
    visibility: visible;
  }

  body[data-devtools-open='true'][data-devtools-tab='react-query'] aside[aria-label='Tanstack query devtools'] {
    visibility: visible;
  }
`

const DrawerWrapper = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  transition: bottom 0.3s ease;

  body[data-devtools-open='true'] & {
    bottom: calc(50vh - 32px);
  }
`

const TabBar = styled.div`
  display: flex;
  align-items: stretch;
  background-color: #1e1e2e;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  pointer-events: auto;
`

const Tab = styled.button<{ $isActive: boolean }>`
  padding: 8px 16px;
  border: none;
  background-color: ${(props) => (props.$isActive ? '#313244' : '#1e1e2e')};
  color: ${(props) => (props.$isActive ? '#cdd6f4' : '#6c7086')};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid ${(props) => (props.$isActive ? '#89b4fa' : 'transparent')};

  &:hover {
    background-color: #313244;
    color: #cdd6f4;
  }
`

const ToggleButton = styled.button`
  padding: 8px 12px;
  border: none;
  background-color: #1e1e2e;
  color: #6c7086;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 1px solid #313244;

  &:hover {
    background-color: #313244;
    color: #cdd6f4;
  }
`
