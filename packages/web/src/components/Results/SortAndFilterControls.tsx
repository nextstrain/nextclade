import React from 'react'

import styled from 'styled-components'

import { BsCaretDownFill, BsCaretUpFill } from 'react-icons/bs'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'

const SORT_BUTTON_SIZE = '16px'

export const SortButtonWrapper = styled.div`
  flex: 0;
  margin: auto 10px;
`

export interface SortAndFilterControlsProps {
  sortAsc(): void
  sortDesc(): void
}

export function SortAndFilterControls({ sortAsc, sortDesc }: SortAndFilterControlsProps) {
  return (
    <SortButtonWrapper>
      <ButtonTransparent width={SORT_BUTTON_SIZE} onClick={sortAsc}>
        <BsCaretUpFill />
      </ButtonTransparent>
      <ButtonTransparent width={SORT_BUTTON_SIZE} onClick={sortDesc}>
        <BsCaretDownFill />
      </ButtonTransparent>
    </SortButtonWrapper>
  )
}
