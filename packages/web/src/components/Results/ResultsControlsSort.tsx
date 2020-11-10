import React from 'react'

import styled from 'styled-components'

import { BsCaretDownFill, BsCaretUpFill } from 'react-icons/bs'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'

const SORT_BUTTON_SIZE = '16px'
const SORT_BUTTON_ICON_SIZE = '8px'

export const SortButtonWrapper = styled.div`
  flex: 0;
  margin: auto 3px;
  text-align: center;
  align-items: center;
`

export const SortButton = styled(ButtonTransparent)`
  color: #cccccc;

  &.show > .btn-secondary.dropdown-toggle,
  &.active,
  &:active,
  &:hover,
  &:focus,
  &:focus-within {
    color: #cccccc;
  }
`

export interface ResultsControlsSortProps {
  sortAsc(): void

  sortDesc(): void
}

export function ResultsControlsSort({ sortAsc, sortDesc }: ResultsControlsSortProps) {
  return (
    <SortButtonWrapper>
      <SortButton height={SORT_BUTTON_SIZE} onClick={sortDesc}>
        <BsCaretUpFill size={SORT_BUTTON_ICON_SIZE} />
      </SortButton>
      <SortButton height={SORT_BUTTON_SIZE} onClick={sortAsc}>
        <BsCaretDownFill size={SORT_BUTTON_ICON_SIZE} />
      </SortButton>
    </SortButtonWrapper>
  )
}
