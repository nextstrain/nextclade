import React, { useState } from 'react'

import ReactResizeDetector from 'react-resize-detector'

import type { AnalyzeSeqResult } from 'src/algorithms/run'

import { MutationView } from './MutationView'
import { MutationTooltip } from './MutationTooltip'
import type { MutationElementWithId, MutationElement } from './types'

const GENOME_SIZE = 30000 as const // TODO: deduce from sequences?
const BASE_MIN_WIDTH_PX = 4 as const

export function getMutationIdentifier({ seqName, positionZeroBased, allele }: MutationElement) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}-${positionZeroBased}-${allele}`)
}

export interface SequenceViewProps {
  sequence: AnalyzeSeqResult
}

export function SequenceView({ sequence }: SequenceViewProps) {
  const [mutation, setMutation] = useState<MutationElementWithId | undefined>(undefined)
  const { seqName, mutations } = sequence

  return (
    <ReactResizeDetector handleWidth refreshRate={300} refreshMode="debounce">
      {({ width: widthPx }: { width?: number }) => {
        if (!widthPx) {
          return <div className="w-100 h-100" />
        }

        const pixelsPerBase = widthPx / GENOME_SIZE
        const width = Math.max(BASE_MIN_WIDTH_PX, 1 * pixelsPerBase)

        const mutationViews = Object.entries(mutations).map(([positionZeroBased, allele]) => {
          const id = getMutationIdentifier({ seqName, positionZeroBased, allele })
          const mutation: MutationElementWithId = { id, seqName, positionZeroBased, allele }
          return (
            <MutationView
              key={positionZeroBased}
              mutation={mutation}
              width={width}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setMutation(mutation)}
              onMouseLeave={() => setMutation(undefined)}
            />
          )
        })

        return (
          <div className="sequence-view-wrapper d-inline-flex">
            <svg className="sequence-view-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="sequence-view-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {mutationViews}
            </svg>
            {mutation && <MutationTooltip mutation={mutation} />}
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}
