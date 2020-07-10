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
  // const [isOpen, setIsOpen] = useState(false)
  const [buttonFocused, setButtonFocused] = useState(false)
  const [tooltipFocused, setTooltipFocused] = useState(false)

  // const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen])

  // const open = useCallback(() => setIsOpen(true), [])
  // const close = useCallback(() => setIsOpen(false), [])

  return (
    <FilterButtonWrapper>
      <ButtonTransparent
        id={identifier}
        width={FILTER_BUTTON_SIZE}
        // onClick={toggle}
        onFocus={() => setButtonFocused(true)}
        onBlur={() => setButtonFocused(false)}
      >
        <FaFilter size={FILTER_BUTTON_ICON_SIZE} />
      </ButtonTransparent>
      <Tooltip
        target={identifier}
        isOpen={buttonFocused || tooltipFocused}
        // isOpen={isOpen || tooltipFocused}
        placement="auto-start"
        hideArrow={false}
        // toggle={toggle}
        onFocus={() => setTooltipFocused(true)}
        onBlur={() => setTooltipFocused(false)}
        // onBlur={close}
      >
        {children}
      </Tooltip>
    </FilterButtonWrapper>
  )
}
