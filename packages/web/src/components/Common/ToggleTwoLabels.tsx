import React, { ReactNode, useCallback } from 'react'

import styled from 'styled-components'
import ReactToggle, { ToggleProps as ReactToggleProps } from 'react-toggle'
import 'react-toggle/style.css'
import { StrictOmit } from 'ts-essentials'

export const ToggleTwoLabelsBase = styled(ReactToggle)<ReactToggleProps>`
  &.react-toggle-two-labels-custom {
    & > .react-toggle-track {
      background-color: #4a5bc6;
    }

    &.react-toggle--checked > .react-toggle-track {
      background-color: #d06e0b;
    }

    &:hover {
      & > .react-toggle-track {
        background-color: #4f96cb;
      }

      &.react-toggle--checked > .react-toggle-track {
        background-color: #c69c45;
      }
    }
  }
`

export interface ToggleTwoLabelsProps extends StrictOmit<ReactToggleProps, 'type' | 'value'> {
  identifier: string
  onCheckedChanged: (checked: boolean) => void
  labelLeft?: ReactNode
  labelRight?: ReactNode
}

export function ToggleTwoLabels({
  identifier,
  className,
  onCheckedChanged,
  labelLeft,
  labelRight,
  ...props
}: ToggleTwoLabelsProps) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChanged(e.target.checked)
    },
    [onCheckedChanged],
  )

  return (
    <label htmlFor={identifier} className="d-flex m-0">
      {labelRight}
      <span className="mr-2 ml-2">
        <ToggleTwoLabelsBase
          id={identifier}
          className="react-toggle-two-labels-custom"
          icons={false}
          onChange={onChange}
          {...props}
        />
      </span>
      {labelLeft}
    </label>
  )
}
