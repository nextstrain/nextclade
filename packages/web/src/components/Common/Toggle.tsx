import React, { useCallback } from 'react'

import type { StrictOmit } from 'ts-essentials'
import classNames from 'classnames'
import styled from 'styled-components'
import { CustomInput, CustomInputProps } from 'reactstrap'

export const ToggleBase = styled(CustomInput)`
  padding: 0;
  margin: 0;

  -moz-user-select: none;
  -ms-user-select: none;
  -o-user-select: none;
  -webkit-user-select: none;
  user-select: none;

  & input {
    padding: 0;
    margin: 0;
    width: 0;
    height: 0;
    border: 0;
  }

  transform: scale(1.25) translateX(7px);

  & .custom-control-label::before,
  & .custom-control-label::after {
    cursor: pointer;
  }
`

export interface ToggleProps extends StrictOmit<CustomInputProps, 'type' | 'value'> {
  onCheckedChanged: (checked: boolean) => void
}

export function Toggle({ className, onCheckedChanged, ...props }: ToggleProps) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChanged(e.target.checked)
    },
    [onCheckedChanged],
  )

  return (
    <ToggleBase
      className={classNames('custom-switch', className)}
      type="checkbox"
      onChange={onChange}
      title={'Disable this rule'}
      {...props}
    />
  )
}
