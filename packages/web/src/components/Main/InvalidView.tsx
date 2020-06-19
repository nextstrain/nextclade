import React, { SVGProps } from 'react'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { InvalidElementWithId } from 'src/components/Main/types'

import { getBaseColor } from './MutationView'

export interface InvalidViewProps extends SVGProps<SVGRectElement> {
  inv: InvalidElementWithId
  pixelsPerBase: number
}

export function InvalidView({ inv, pixelsPerBase, ...rest }: InvalidViewProps) {
  const { id, character, begin, end } = inv
  const fill = getBaseColor(character)
  let width = (end - begin) * pixelsPerBase
  const x = begin * pixelsPerBase
  width = Math.max(BASE_MIN_WIDTH_PX)
  return <rect id={id} fill={fill} x={x} y={-10} width={width} height="30" {...rest} />
}
