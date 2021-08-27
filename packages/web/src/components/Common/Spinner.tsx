import React, { HTMLProps } from 'react'

import type { StrictOmit } from 'ts-essentials'
import styled from 'styled-components'
import ReactLoaderSpinner, { LoaderProps } from 'react-loader-spinner'

const Loader = styled(ReactLoaderSpinner)`
  display: inline;
`

const LoaderWrapper = styled.div<HTMLProps<HTMLDivElement>>`
  width: 100%;
  height: 100%;
  display: flex;
`

const LoaderWrapperInternal = styled.div`
  margin: auto;
`

export interface SpinnerProps extends StrictOmit<HTMLProps<HTMLDivElement>, 'as' | 'ref'> {
  color: string
  size: number
  type?: LoaderProps['type']
}

export function Spinner({ size, color, type = 'Oval' }: SpinnerProps) {
  return <Loader type={type} color={color} height={size} width={size} />
}

export function SpinnerWrapped({ size, color, type = 'Oval', ...restProps }: SpinnerProps) {
  return (
    <LoaderWrapper {...restProps}>
      <LoaderWrapperInternal>
        <Spinner type={type} color={color} size={size} />
      </LoaderWrapperInternal>
    </LoaderWrapper>
  )
}
