import React, { SVGProps } from 'react'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { MissingElementWithId } from 'src/components/Main/types'

import { getBaseColor } from './MutationView'

export interface MissingViewProps extends SVGProps<SVGRectElement> {
  inv: MissingElementWithId
  pixelsPerBase: number
}

export function MissingView({ inv, pixelsPerBase, ...rest }: MissingViewProps) {
  const { id, character, begin, end } = inv
  const fill = getBaseColor(character)
  let width = (end - begin) * pixelsPerBase
  const x = begin * pixelsPerBase
  width = Math.max(BASE_MIN_WIDTH_PX)
  return <rect id={id} fill={fill} x={x} y={-10} width={width} height="30" {...rest} />
}
