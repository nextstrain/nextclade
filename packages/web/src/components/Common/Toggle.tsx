import React, { useCallback } from 'react'

import type { StrictOmit } from 'ts-essentials'
import styled from 'styled-components'

import ReactToggle, { ToggleProps as ReactToggleProps } from 'react-toggle'
import 'react-toggle/style.css'

export const ToggleBase = styled(ReactToggle)<ReactToggleProps>`
  &.react-toggle-custom {
    & > .react-toggle-track {
      background-color: #9c3434;
    }

    &.react-toggle--checked > .react-toggle-track {
      background-color: #459f25;
    }

    &:hover {
      & > .react-toggle-track {
        background-color: #b95353;
      }

      &.react-toggle--checked > .react-toggle-track {
        background-color: #5db240;
      }
    }
  }
`

export interface ToggleProps extends StrictOmit<ReactToggleProps, 'type' | 'value'> {
  onCheckedChanged: (checked: boolean) => void
}

export function Toggle({ className, onCheckedChanged, ...props }: ToggleProps) {
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChanged(e.target.checked)
    },
    [onCheckedChanged],
  )

  return <ToggleBase className="react-toggle-custom" onChange={onChange} {...props} />
}
