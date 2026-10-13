import React, { ReactNode, useCallback, useState } from 'react'
import {
  Dropdown as DropdownBase,
  DropdownToggle as DropdownToggleBase,
  DropdownMenu as DropdownMenuBase,
  DropdownProps,
} from 'reactstrap'
import styled from 'styled-components'
import { MdOutlineMenu } from 'react-icons/md'

export interface NavigationMenuProps extends DropdownProps {
  links: ReactNode[]
  /** Icon-only links, shown in one row below the other links */
  iconLinks?: ReactNode[]
}

export function NavigationMenu({ links, iconLinks, ...restProps }: NavigationMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = useCallback(() => setDropdownOpen((prevState) => !prevState), [])

  return (
    <Dropdown inNavbar nav direction="left" isOpen={dropdownOpen} toggle={toggle} {...restProps}>
      <DropdownToggle nav>
        <MdOutlineMenu size={30} />
      </DropdownToggle>
      <DropdownMenu>
        <DropdownMenuListWrapper>{links}</DropdownMenuListWrapper>
        {iconLinks && <IconLinksRow>{iconLinks}</IconLinksRow>}
      </DropdownMenu>
    </Dropdown>
  )
}

const Dropdown = styled(DropdownBase)`
  display: block !important;
  margin: 0 !important;
`

const DropdownToggle = styled(DropdownToggleBase)`
  color: ${(props) => props.theme.bodyColor};
  padding: 2px;
  margin: 0;
`

const DropdownMenu = styled(DropdownMenuBase)`
  position: absolute !important;
  right: 0 !important;
  top: 20px !important;

  background-color: ${(props) => props.theme.bodyBg};
  box-shadow: 1px 1px 20px 0 #0005;
  transition: opacity ease-out 0.25s;
  padding: 1rem;
  padding-right: 0;
  width: 200px;
`

const DropdownMenuListWrapper = styled.ul`
  max-height: calc(80vh - 150px);
  min-height: 100px;
  overflow-y: auto;
  padding: 0;

  > li {
    list-style: none;
  }

  /* Comfortable tap targets on touch screens */
  > li > a,
  > li > span {
    display: block;
    padding: 0.375rem 0.5rem;
  }
`

const IconLinksRow = styled.ul`
  display: flex;
  margin: 0.5rem 0 0;
  padding: 0;

  > li {
    list-style: none;
    margin: 0;
  }

  > li > a {
    display: block;
    padding: 0.375rem 0.5rem;
  }
`
