import React from 'react'

import styled from 'styled-components'
import type { StrictOmit } from 'ts-essentials'
import { InputProps, Label as ReactstrapLabel } from 'reactstrap'

import { Toggle } from 'src/components/Common/Toggle'

export const HeaderWrapper = styled.div`
  display: flex;
`
export const HeaderTitle = styled(ReactstrapLabel)`
  flex: 1;
`
export const HeaderSwitch = styled.div`
  flex: 0;
`

export interface CardHeaderWithToggleProps extends StrictOmit<InputProps, 'type'> {
  identifier: string
  text: string
  checked: boolean

  onValueChanged(checked: boolean): void
}

export function CardHeaderWithToggle({
  identifier,
  text,
  checked,
  onValueChanged,
  ...props
}: CardHeaderWithToggleProps) {
  return (
    <HeaderWrapper>
      <HeaderTitle htmlFor={identifier}>{text}</HeaderTitle>
      <HeaderSwitch>
        <Toggle identifier={identifier} checked={checked} onCheckedChanged={onValueChanged} {...props} />
      </HeaderSwitch>
    </HeaderWrapper>
  )
}
