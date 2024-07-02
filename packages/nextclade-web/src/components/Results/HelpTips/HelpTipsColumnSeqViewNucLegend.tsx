import React from 'react'
import styled from 'styled-components'
import { Col, Row } from 'reactstrap'
import { NUCLEOTIDE_COLORS } from 'src/helpers/getNucleotideColor'
import { splitToColumns } from './HelpTipsColumnSeqViewGeneLegend'

const SIZE = 20

export const Legend = styled(Row)`
  width: 100%;
  //margin-bottom: 10px;
`

export const LegendItem = styled(Col)`
  display: flex;
  margin: 3px;
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
  const columns = splitToColumns(NUCLEOTIDE_COLORS, 5)

  return (
    <Legend>
      <Row>
        {columns.map((col, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Col key={i}>
            {Object.entries(col).map(([aa, color]) => (
              <LegendItem key={aa}>
                <LegendColorBox color={color} />
                {aa}
              </LegendItem>
            ))}
          </Col>
        ))}
      </Row>
    </Legend>
  )
}
