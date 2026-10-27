import { isNil } from 'lodash'
import React from 'react'
import styled from 'styled-components'
import type { CladeColor } from 'src/components/Results/cladeColor'

export interface CladeColorValueProps {
  /** Value of the attribute, which the text shows */
  value: string
  /** How the tree draws the tips with this value, if the tree has a coloring by the attribute */
  color: CladeColor | undefined
}

/** Value of a clade-like attribute, after a circle that looks like the tips of this value on the tree */
export function CladeColorValue({ value, color }: CladeColorValueProps) {
  return (
    <ValueWrapper>
      {isNil(color) ? null : <CladeColorSwatch color={color} />}
      <span>{value}</span>
    </ValueWrapper>
  )
}

interface CladeColorSwatchProps {
  color: CladeColor
}

/** Circle that looks like a tree tip: a lighter fill inside an outline of the tip color */
function CladeColorSwatch({ color }: CladeColorSwatchProps) {
  return (
    <Swatch viewBox="0 0 12 12" aria-hidden>
      <circle cx={6} cy={6} r={5} fill={color.fill} stroke={color.stroke} strokeWidth={1.5} />
    </Swatch>
  )
}

const ValueWrapper = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const Swatch = styled.svg`
  display: block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
`
