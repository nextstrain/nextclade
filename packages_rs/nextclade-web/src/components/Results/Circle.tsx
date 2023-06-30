import styled from 'styled-components'
import { QcStatus } from 'src/types'
import React from 'react'

const CIRCLE_SZE_PX = 20

const statusColors = {
  good: '#68b844',
  mediocre: '#e4902f',
  bad: '#da4e3c',
}

export const CircleBase = styled.div<{ color: string }>`
  flex: 0;
  margin: 5px auto;
  width: ${CIRCLE_SZE_PX}px;
  height: ${CIRCLE_SZE_PX}px;
  min-width: ${CIRCLE_SZE_PX}px;
  min-height: ${CIRCLE_SZE_PX}px;
  border-radius: ${CIRCLE_SZE_PX / 2}px;
  background-color: ${(props) => props.color};

  box-shadow: ${(props) => props.theme.shadows.slight};

  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -o-user-select: none;
  user-select: none;
`
export const CircleText = styled.div`
  color: ${(props) => props.theme.gray100};
  font-size: 0.85rem;
  text-align: center;
  vertical-align: middle;
  line-height: ${CIRCLE_SZE_PX}px;
`

export interface CircleProps {
  status: QcStatus
  text: string
}

export function Circle({ status, text }: CircleProps) {
  const color = statusColors[status]

  return (
    <CircleBase color={color}>
      <CircleText>{text}</CircleText>
    </CircleBase>
  )
}
