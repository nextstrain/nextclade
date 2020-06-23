import React, { SVGProps } from 'react'

import { get } from 'lodash'

import { MutationElementWithId } from 'src/algorithms/types'

const BASE_COLORS: Record<string, string> = {
  'A': '#1167b7',
  'T': '#ad871c',
  'G': '#79ac34',
  'C': '#d04343',
  'N': '#555555',
  '-': '#555555',
} as const

export function getBaseColor(allele: string) {
  return get(BASE_COLORS, allele) ?? BASE_COLORS.N
}

export interface MutationViewProps extends SVGProps<SVGRectElement> {
  mutation: MutationElementWithId
  pixelsPerBase: number
  width: number
}

export function MutationView({ mutation, pixelsPerBase, width, onClick, ...rest }: MutationViewProps) {
  const { id, pos, allele } = mutation
  const fill = getBaseColor(allele)
  const x = pos * pixelsPerBase
  return <rect id={id} fill={fill} x={x} y={-10} width={width} height="30" {...rest} />
}
