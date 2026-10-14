import React, { useCallback, useState } from 'react'
import { FaCaretDown } from 'react-icons/fa'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'
import styled from 'styled-components'
import { treeTabButtonStyle } from 'src/components/Tree/TreeTabButton'
import type { TreeDownload } from 'src/components/Tree/useTreeDownloads'
import { SIDEBAR_THEME } from 'src/components/Layout/sidebarTheme'

export interface TreeDownloadsMenuProps {
  /** Text of the menu button */
  label: string
  /** Tooltip of the menu button */
  title: string
  downloads: TreeDownload[]
}

/** The downloads of the tree page in one menu, for where there is no room for a button per download */
export function TreeDownloadsMenu({ label, title, downloads }: TreeDownloadsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useCallback(() => setIsOpen((isOpen) => !isOpen), [])

  return (
    <Dropdown isOpen={isOpen} toggle={toggle}>
      <Toggle tag="button" type="button" title={title}>
        {label}
        <FaCaretDown />
      </Toggle>
      {/* In the document body, above the tree and its legend, which overlap the header */}
      <Menu right container="body">
        {downloads.map((download) => (
          <MenuItem key={download.name} onClick={download.save} disabled={!download.isAvailable}>
            <MenuItemName>{download.name}</MenuItemName>
            <MenuItemDescription>{download.description}</MenuItemDescription>
          </MenuItem>
        ))}
      </Menu>
    </Dropdown>
  )
}

/** The toggle is a plain button: Popper positions the menu from the button's DOM element, which reactstrap gets
through the `ref` of plain elements only */
const Toggle = styled(DropdownToggle)`
  ${treeTabButtonStyle}
`

const Menu = styled(DropdownMenu)`
  width: max-content;
  min-width: 260px;
  max-width: min(320px, calc(100vw - 32px));
  padding: 4px 0;
  font-family: ${SIDEBAR_THEME['font-family']};
  font-size: 14px;
`

const MenuItem = styled(DropdownItem)`
  padding: 4px 16px;
  white-space: normal;

  &:active {
    background-color: ${SIDEBAR_THEME.selectedColor};
  }
`

const MenuItemName = styled.span`
  display: block;
`

const MenuItemDescription = styled.span`
  display: block;
  color: #888;
  font-size: 12px;

  ${MenuItem}:active & {
    color: inherit;
  }
`
