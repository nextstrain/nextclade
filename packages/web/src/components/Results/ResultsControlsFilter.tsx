import React, { PropsWithChildren, useCallback, useState } from 'react'

import styled from 'styled-components'
import { FaFilter } from 'react-icons/fa'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'

const FILTER_BUTTON_SIZE = '15px'

export const FilterButtonWrapper = styled.div`
  flex: 0;
  margin: auto 7px;
`

export function ResultsControlsFilter({ children }: PropsWithChildren<unknown>) {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen])

  return (
    <FilterButtonWrapper>
      <ButtonTransparent width={FILTER_BUTTON_SIZE} onClick={toggle}>
        <FaFilter />
      </ButtonTransparent>
    </FilterButtonWrapper>
  )
}
