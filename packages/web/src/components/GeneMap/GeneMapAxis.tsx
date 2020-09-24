import React from 'react'

import { range } from 'lodash'
import { connect } from 'react-redux'
import { XAxis, ComposedChart, ResponsiveContainer } from 'recharts'

import type { State } from 'src/state/reducer'
import { selectParams } from 'src/state/algorithm/algorithm.selectors'

export interface AxisProps {
  genomeSize: number
}

const TICK_STEP = 5000
const MARGIN = {}

const mapStateToProps = (state: State) => ({
  genomeSize: selectParams(state).virus.genomeSize,
})
const mapDispatchToProps = {}

export const GeneMapAxis = connect(mapStateToProps, mapDispatchToProps)(GeneMapAxisDisconnected)

export function GeneMapAxisDisconnected({ genomeSize }: AxisProps) {
  const domain: [number, number] = [0, genomeSize]
  const ticks = range(0, genomeSize, TICK_STEP)
  return (
    <ResponsiveContainer width="100%" height={30}>
      <ComposedChart margin={MARGIN}>
        <XAxis dataKey={'ticks'} type="number" ticks={ticks} domain={domain} axisLine={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
