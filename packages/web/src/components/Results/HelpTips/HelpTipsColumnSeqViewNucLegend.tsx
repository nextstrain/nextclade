import React from 'react'
import styled from 'styled-components'
import { Col, Row } from 'reactstrap'

import { NUCLEOTIDE_COLORS } from 'src/helpers/getNucleotideColor'

const SIZE = 20

export const Legend = styled(Row)`
  width: 100%;
  margin-bottom: 10px;
`

export const LegendItem = styled(Col)`
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

export function HelpTipsColumnSeqViewNucLegend() {
  return (
    <Legend>
      {Object.entries(NUCLEOTIDE_COLORS).map(([nuc, color]) => (
        <LegendItem key={nuc}>
          <LegendColorBox color={color} />
          {nuc}
        </LegendItem>
      ))}
    </Legend>
  )
}
