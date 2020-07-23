import React, { PropsWithChildren } from 'react'

import { Popover, PopoverBody, PopoverProps } from 'reactstrap'

export function Tooltip({ children, placement, hideArrow, ...restProps }: PropsWithChildren<PopoverProps>) {
  return (
    <Popover placement={placement ?? 'auto'} hideArrow={hideArrow ?? true} delay={0} fade={false} {...restProps}>
      <PopoverBody>{children}</PopoverBody>
    </Popover>
  )
}
