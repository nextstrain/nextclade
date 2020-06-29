import React from 'react'

import { XAxis, ComposedChart, ResponsiveContainer } from 'recharts'

import { range } from 'lodash'

export interface AxisProps {
  genomeSize: number
}

const TICK_STEP = 5000
const MARGIN = {}

export function GeneMapAxis({ genomeSize }: AxisProps) {
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
