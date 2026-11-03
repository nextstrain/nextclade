import React from 'react'
import { DropdownMenu, DropdownMenuProps } from 'reactstrap'
import styled from 'styled-components'
import { VIEWPORT_PADDING } from 'src/helpers/viewport'

/** Popper modifiers which move the menu back into the viewport when it would cross an edge */
const MODIFIERS = {
  preventOverflow: {
    boundariesElement: 'viewport',
    padding: VIEWPORT_PADDING,
  },
}

/**
 * Dropdown menu which stays fully inside the viewport, including on narrow phone screens.
 *
 * The menu is never wider than the viewport, and Popper shifts it along the edges so that no part of it is cut off.
 * The enclosing `Dropdown` must not set `inNavbar`, because `inNavbar` disables Popper positioning.
 */
export function DropdownMenuInViewport({ modifiers, ...restProps }: DropdownMenuProps) {
  return <DropdownMenuStyled modifiers={{ ...MODIFIERS, ...modifiers }} {...restProps} />
}

const DropdownMenuStyled = styled(DropdownMenu)`
  max-width: calc(100vw - ${VIEWPORT_PADDING * 2}px);
`
