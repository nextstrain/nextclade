import React, { PropsWithChildren } from 'react'

import styled from 'styled-components'
import { Popover as ReactstrapPopover, PopoverBody as ReactstrapPopoverBody, PopoverProps } from 'reactstrap'

const PopoverBody = styled(ReactstrapPopoverBody)`
  display: block;
  width: 100%;
`

export const Popover = styled(ReactstrapPopover).withConfig({
  shouldForwardProp: (prop) => prop !== 'wide',
})<PopoverProps & { wide: boolean }>`
  & .popover.show.bs-popover-auto {
    min-width: ${(props) => (props.wide ? '350px' : undefined)};
  }
`

export interface TooltipProps extends PropsWithChildren<PopoverProps> {
  wide?: boolean
}

export function Tooltip({ children, placement, hideArrow, wide, ...restProps }: TooltipProps) {
  return (
    <Popover
      placement={placement ?? 'auto'}
      hideArrow={hideArrow ?? true}
      delay={0}
      fade={false}
      wide={wide}
      {...restProps}
    >
      <PopoverBody>{children}</PopoverBody>
    </Popover>
  )
}
