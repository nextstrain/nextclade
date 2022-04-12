import React, { PropsWithChildren } from 'react'

import styled from 'styled-components'
import { Popover as ReactstrapPopover, PopoverBody as ReactstrapPopoverBody, PopoverProps } from 'reactstrap'

const PopoverBody = styled(ReactstrapPopoverBody)`
  display: block;
  width: 100%;
`

export const Popover = styled(ReactstrapPopover)<
  PopoverProps & { $wide?: boolean; $fullWidth?: boolean; $width: string }
>`
  & .popover {
    max-width: ${(props) => (props.$width ? props.$width : props.$fullWidth && '100%')};
  }

  & .popover.show.bs-popover-auto {
    min-width: ${(props) => (props.$width ? props.$width : props.$wide && '350px')};
  }
`

export interface TooltipProps extends PropsWithChildren<PopoverProps> {
  wide?: boolean
  fullWidth?: boolean
  tooltipWidth?: string
}

export function Tooltip({ children, placement, hideArrow, wide, fullWidth, tooltipWidth, ...restProps }: TooltipProps) {
  return (
    <Popover
      placement={placement}
      hideArrow={hideArrow ?? true}
      delay={0}
      fade={false}
      $wide={wide}
      $fullWidth={fullWidth}
      $width={tooltipWidth}
      {...restProps}
    >
      <PopoverBody>{children}</PopoverBody>
    </Popover>
  )
}
