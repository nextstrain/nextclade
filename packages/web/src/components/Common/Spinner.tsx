import React from 'react'

import styled from 'styled-components'
import ReactLoaderSpinner from 'react-loader-spinner'

const Loader = styled(ReactLoaderSpinner)`
  display: inline;
`

export interface SpinnerProps {
  color: string
  size: number
}

export function Spinner({ size, color }: SpinnerProps) {
  return <Loader type="Oval" color={color} height={size} width={size} />
}
