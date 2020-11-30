import styled from 'styled-components'
import { Tab as ReactTab, TabList as ReactTabList, TabPanel as ReactTabPanel, Tabs as ReactTabs } from 'react-tabs'

export const Tab = styled(ReactTab)`
  display: inline-block;
  border: 1px solid transparent;
  border-bottom: none;
  bottom: -1px;
  position: relative;
  list-style: none;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 3px 3px 0 0;
  margin: 10px 10px;

  &.react-tabs__tab--selected {
    background: #fff;
    border-color: #aaa;
    color: #222;
  }

  .react-tabs__tab--disabled {
    color: GrayText;
    cursor: default;
  }

  &:focus {
    box-shadow: 0 0 5px hsl(208, 99%, 50%);
    border-color: hsl(208, 99%, 50%);
    outline: none;
  }

  &:focus:after {
    content: '';
    position: absolute;
    height: 5px;
    left: -4px;
    right: -4px;
    bottom: -5px;
    background: #fff;
  }
`

export const TabContainer = styled.div`
  text-align: center;
`

export const TabList = styled(ReactTabList)`
  border-bottom: 1px solid #aaa;
  margin: 0 0 10px;
  padding: 5px 5px;
  height: 42px;
`

export const TabPanel = styled(ReactTabPanel)`
  display: none;

  &.react-tabs__tab-panel--selected {
    display: flex;
  }
`

export const Tabs = styled(ReactTabs)`
  -webkit-tap-highlight-color: transparent;
`
