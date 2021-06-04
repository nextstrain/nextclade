import React, { PropsWithChildren } from 'react'

import styled from 'styled-components'
import { Popover as ReactstrapPopover, PopoverBody as ReactstrapPopoverBody, PopoverProps } from 'reactstrap'

const PopoverBody = styled(ReactstrapPopoverBody)`
  display: block;
  width: 100%;
`

export const Popover = styled(ReactstrapPopover)<PopoverProps & { $wide?: boolean; $fullWidth?: boolean }>`
  & .popover {
    max-width: ${(props) => props.$fullWidth && '100%'};
  }

  & .popover.show.bs-popover-auto {
    min-width: ${(props) => props.$wide && '350px'};
  }
`

export interface TooltipProps extends PropsWithChildren<PopoverProps> {
  wide?: boolean
  fullWidth?: boolean
}

export function Tooltip({ children, placement, hideArrow, wide, fullWidth, ...restProps }: TooltipProps) {
  return (
    <Popover
      placement={placement ?? 'auto'}
      hideArrow={hideArrow ?? true}
      delay={0}
      fade={false}
      $wide={wide}
      $fullWidth={fullWidth}
      {...restProps}
    >
      <PopoverBody>{children}</PopoverBody>
    </Popover>
  )
}
