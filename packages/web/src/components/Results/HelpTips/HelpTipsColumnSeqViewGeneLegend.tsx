import React from 'react'
import styled from 'styled-components'

import { AMINOACID_COLORS } from 'src/helpers/getAminoacidColor'
import { Col, Row } from 'reactstrap'

const SIZE = 20

export const Legend = styled.div`
  width: 100%;
  margin-bottom: 10px;
`

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

export function splitToColumns(obj: { [key: string]: string }, colSize: number) {
  const n = Object.keys(obj).length

  const cols: { [key: string]: string }[] = []
  // eslint-disable-next-line no-loops/no-loops
  for (let i = 0; ; i += colSize) {
    const col = Object.fromEntries(Object.entries(obj).slice(i, i + colSize))
    cols.push(col)
    if (i > n) {
      break
    }
  }

  return cols
}

export function HelpTipsColumnSeqViewGeneLegend() {
  const columns = splitToColumns(AMINOACID_COLORS, 4)

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
