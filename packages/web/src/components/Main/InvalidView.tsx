import React, { SVGProps } from 'react'

import type { InvalidElementWithId } from 'src/components/Main/types'

import { BASE_MIN_WIDTH_PX } from './SequenceView'
import { getBaseColor } from './MutationView'

export interface InvalidViewProps extends SVGProps<SVGRectElement> {
  inv: InvalidElementWithId
  pixelsPerBase: number
}

export function InvalidView({ inv, pixelsPerBase, ...rest }: InvalidViewProps) {
  const { id, character, begin, end } = inv
  const fill = getBaseColor(character)
  let widthPx = (end - begin) * pixelsPerBase
  const x = begin * pixelsPerBase + widthPx * 0.5
  widthPx = Math.max(BASE_MIN_WIDTH_PX)
  return <rect id={id} fill={fill} x={x} y={-10} width={widthPx} height="30" {...rest} />
}
