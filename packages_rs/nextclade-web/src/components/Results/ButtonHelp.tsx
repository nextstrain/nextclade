import React, { PropsWithChildren, useState } from 'react'

import type { ButtonProps, PopoverProps } from 'reactstrap'
import styled from 'styled-components'

import { ButtonTransparent } from 'src/components/Common/ButtonTransparent'
import { Tooltip } from 'src/components/Results/Tooltip'

export const ButtonHelpStyle = styled(ButtonTransparent)`
  color: ${(props) => props.theme.gray600};
  position: relative;
  top: -15px;
  margin: 0 auto;
  width: 20px;
  height: 20px;
`

export interface ButtonHelpProps extends PropsWithChildren<ButtonProps> {
  identifier: string
  wide?: boolean
  tooltipWidth?: string
  tooltipPlacement?: PopoverProps['placement']
}

export function ButtonHelpSimple({
  identifier,
  children,
  wide,
  tooltipWidth,
  tooltipPlacement = 'bottom-end',
  ...restProps
}: ButtonHelpProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <ButtonTransparent
      id={identifier}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      {...restProps}
    >
      {'?'}
      {children && (
        <Tooltip
          isOpen={showTooltip}
          target={identifier}
          placement={tooltipPlacement}
          wide={wide}
          $width={tooltipWidth}
        >
          {children}
        </Tooltip>
      )}
    </ButtonTransparent>
  )
}

export function ButtonHelp({
  identifier,
  children,
  wide,
  tooltipWidth,
  tooltipPlacement = 'bottom-end',
  ...restProps
}: ButtonHelpProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <ButtonHelpStyle
      id={identifier}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      {...restProps}
    >
      {'?'}
      {children && (
        <Tooltip
          isOpen={showTooltip}
          target={identifier}
          placement={tooltipPlacement}
          wide={wide}
          $width={tooltipWidth}
        >
          {children}
        </Tooltip>
      )}
    </ButtonHelpStyle>
  )
}
