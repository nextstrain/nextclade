import React, { PropsWithChildren, useCallback, useState } from 'react'

import styled from 'styled-components'
import { FaFilter } from 'react-icons/fa'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { Tooltip } from 'src/components/Results/Tooltip'

const FILTER_BUTTON_SIZE = '12px'
const FILTER_BUTTON_ICON_SIZE = '12px'

export const FilterButtonWrapper = styled.div`
  flex: 0;
  margin: auto 7px;
`

export interface ResultsControlsFilterProps extends PropsWithChildren<unknown> {
  identifier: string
}

export function ResultsControlsFilter({ identifier, children }: ResultsControlsFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <FilterButtonWrapper>
      <ButtonTransparent id={identifier} width={FILTER_BUTTON_SIZE} onFocus={open} onBlur={close}>
        <FaFilter size={FILTER_BUTTON_ICON_SIZE} />
      </ButtonTransparent>
      <Tooltip target={identifier} isOpen={isOpen} placement="auto-start" hideArrow={false}>
        {children}
      </Tooltip>
    </FilterButtonWrapper>
  )
}
