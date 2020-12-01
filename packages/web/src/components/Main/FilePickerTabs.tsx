import styled from 'styled-components'

import {
  Tab as TabBase,
  TabList as TabListBase,
  TabPanel as TabPanelBase,
  Tabs as TabsBase,
} from 'src/components/Common/Tabs'

export const Tabs = styled(TabsBase)`
  border-image: none;
  border-radius: 3px;
  margin: 8px 5px;
  box-shadow: ${(props) => props.theme.shadows.slight};
`

export const TabList = styled(TabListBase)<{ $canCollapse?: boolean }>`
  border: none;
  border-image: none;
  border-image-width: 0;
  height: 48px;
  background-color: #666;
  color: #ddd;
  font-size: 1.25rem;
  padding: 3px;
  padding-bottom: 0;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  margin-bottom: 0;
  display: flex;
  ${({ $canCollapse }) => ($canCollapse === undefined || $canCollapse) && 'cursor: pointer'};
  user-select: none;
`

export const Tab = styled(TabBase)`
  background: #666;
  color: #ccc;
  border-color: #999;
  font-size: 0.9rem;
  width: 125px;

  margin: 1px 1px;
  padding: 8px;

  &.react-tabs__tab--selected {
    border: none;
    border-image: none;
    font-weight: bold;
  }

  :hover {
    background: #777;
    color: #eee;
  }

  &.react-tabs__tab--selected:hover {
    background: #fff;
    color: #333;
    font-weight: bold;
  }
`

export const TabPanel = styled(TabPanelBase)`
  border: none;
  border-image: none;
  border-image-width: 0;
  margin: 3px 2px;
  padding: 6px;
  height: 250px;
`

export const TextContainer = styled.div`
  display: flex;
  flex: 1;
  position: relative;
  padding: 4px 7px;
  margin: auto;

  text-overflow: ellipsis;
  overflow: hidden;

  h1 {
    margin-top: 3px;
    font-weight: bold;
    font-size: 1.1rem;
    white-space: nowrap;
  }
`
