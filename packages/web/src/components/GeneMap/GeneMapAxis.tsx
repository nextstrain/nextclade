import React, { useMemo } from 'react'

import { range } from 'lodash'
import { connect } from 'react-redux'
import { XAxis, ComposedChart, ResponsiveContainer } from 'recharts'

import type { Gene } from 'src/algorithms/types'
import type { State } from 'src/state/reducer'
import { selectGeneMap, selectGenomeSize } from 'src/state/algorithm/algorithm.selectors'
import { getAxisLength } from './getAxisLength'

export interface AxisProps {
  genomeSize?: number
  geneMap?: Gene[]
  viewedGene: string
}

const MARGIN = {}

export function getTickSize(axisLength: number) {
  if (axisLength <= 0) {
    return 0
  }

  const logRange = Math.floor(Math.log10(axisLength))
  let tickSize = 10 ** logRange
  if (axisLength / tickSize < 2) {
    tickSize /= 5
  } else if (axisLength / tickSize < 5) {
    tickSize /= 2
  }
  return tickSize
}

export function getAxisParams(genomeSize: number, viewedGene: string, geneMap: Gene[]) {
  const length = getAxisLength(genomeSize, viewedGene, geneMap)
  const tickSize = getTickSize(length)
  const domain: [number, number] = [0, length]
  const ticks = range(0, length, tickSize)
  return { ticks, domain }
}

export type GeneMapAxisImplProps = Required<AxisProps>

export function GeneMapAxisImpl({ genomeSize, viewedGene, geneMap }: GeneMapAxisImplProps) {
  const { ticks, domain } = useMemo(() => getAxisParams(genomeSize, viewedGene, geneMap), [
    geneMap,
    genomeSize,
    viewedGene,
  ])

  return (
    <ResponsiveContainer width="100%" height={30}>
      <ComposedChart margin={MARGIN}>
        <XAxis dataKey={'ticks'} type="number" ticks={ticks} domain={domain} axisLine={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

const mapStateToProps = (state: State) => ({
  genomeSize: selectGenomeSize(state),
  geneMap: selectGeneMap(state),
  viewedGene: state.ui.viewedGene,
})

const mapDispatchToProps = {}

export const GeneMapAxis = connect(mapStateToProps, mapDispatchToProps)(GeneMapAxisDisconnected)

export function GeneMapAxisDisconnected({ genomeSize, geneMap, viewedGene }: AxisProps) {
  if (!genomeSize || !geneMap) {
    return null
  }

  return <GeneMapAxisImpl genomeSize={genomeSize} geneMap={geneMap} viewedGene={viewedGene} />
}
