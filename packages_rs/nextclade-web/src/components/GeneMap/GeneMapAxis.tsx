import React, { useMemo } from 'react'
import { range } from 'lodash'
import { XAxis, ComposedChart, ResponsiveContainer } from 'recharts'
import { useRecoilValue } from 'recoil'
import { cdsesAtom, genomeSizeAtom } from 'src/state/results.state'
import { viewedCdsAtom } from 'src/state/seqViewSettings.state'
import { getAxisLength } from './getAxisLength'

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

export function GeneMapAxis() {
  const genomeSize = useRecoilValue(genomeSizeAtom)
  const cdses = useRecoilValue(cdsesAtom)
  const viewedGene = useRecoilValue(viewedCdsAtom)

  const { ticks, domain } = useMemo(() => {
    const length = getAxisLength(genomeSize, viewedGene, cdses)
    const tickSize = getTickSize(length)
    const domain: [number, number] = [0, length]
    const ticks = range(0, length, tickSize)
    return { ticks, domain }
  }, [cdses, genomeSize, viewedGene])

  return (
    <ResponsiveContainer width="100%" height={30}>
      <ComposedChart margin={MARGIN}>
        <XAxis dataKey={'ticks'} type="number" ticks={ticks} domain={domain} axisLine={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
