import React, { PropsWithChildren, useState } from 'react'

import type { ButtonProps } from 'reactstrap'
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
}

export function ButtonHelp({ identifier, children }: ButtonHelpProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <ButtonHelpStyle
      id={identifier}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {'?'}
      {children && (
        <Tooltip isOpen={showTooltip} target={identifier} placement="bottom-end">
          {children}
        </Tooltip>
      )}
    </ButtonHelpStyle>
  )
}
