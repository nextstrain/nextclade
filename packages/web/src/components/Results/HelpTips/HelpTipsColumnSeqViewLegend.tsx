import React from 'react'
import styled from 'styled-components'

import { NUCLEOTIDE_COLORS } from '../../../helpers/getNucleotideColor'

const SIZE = 20

export const LegendItem = styled.div`
  display: flex;
`

export const LegendColorBox = styled.span`
  flex: 0 0 ${SIZE}px;
  width: ${SIZE}px;
  height: ${SIZE}px;
  background-color: ${(props) => props.color} !important;
  margin-right: 10px;
  margin-left: 10px;
`

export function HelpTipsColumnSeqViewLegend() {
  return Object.entries(NUCLEOTIDE_COLORS).map(([nuc, color]) => (
    <LegendItem>
      <LegendColorBox color={color} />
      {nuc}
    </LegendItem>
  ))
}
