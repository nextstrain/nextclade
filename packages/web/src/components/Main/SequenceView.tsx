import React, { useState } from 'react'

import ReactResizeDetector from 'react-resize-detector'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { AnalysisResult, MissingElementWithId, MutationElementWithId } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'

import { MissingTooltip } from './MissingTooltip'
import { MissingView } from './MissingView'
import { MutationTooltip } from './MutationTooltip'
import { MutationView } from './MutationView'

export const GENOME_SIZE = 30000 as const // TODO: deduce from sequences?

export interface SequenceViewProps {
  sequence: AnalysisResult
}

export function SequenceView({ sequence }: SequenceViewProps) {
  const [mutation, setMutation] = useState<MutationElementWithId | undefined>(undefined)
  const [currMissing, setCurrMissing] = useState<MissingElementWithId | undefined>(undefined)
  const { seqName, substitutions, missing, deletions } = sequence

  return (
    <ReactResizeDetector handleWidth refreshRate={300} refreshMode="debounce">
      {({ width: widthPx }: { width?: number }) => {
        if (!widthPx) {
          return <div className="w-100 h-100" />
        }

        const pixelsPerBase = widthPx / GENOME_SIZE
        const width = Math.max(BASE_MIN_WIDTH_PX, 1 * pixelsPerBase)

        const mutationViews = substitutions.map(({ pos, allele }) => {
          const id = getSafeId('mutation', { seqName, pos, allele })
          const mutation: MutationElementWithId = { id, seqName, pos, allele }
          return (
            <MutationView
              key={pos}
              mutation={mutation}
              width={width}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setMutation(mutation)}
              onMouseLeave={() => setMutation(undefined)}
            />
          )
        })

        const missingViews = missing.map((inv) => {
          const { character, range } = inv
          const { begin, end } = range
          const id = getSafeId('missing', { seqName, character, begin, end })
          const invWithId: MissingElementWithId = { id, seqName, character, begin, end }

          return (
            <MissingView
              key={id}
              inv={invWithId}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setCurrMissing(invWithId)}
              onMouseLeave={() => setCurrMissing(undefined)}
            />
          )
        })

        const deletionViews = deletions.map(({ start, length }) => {
          const end = start + length
          const id = getSafeId('deletion', { seqName, character: '-', begin: start, end })
          const delWithId: MissingElementWithId = { id, seqName, character: '-', begin: start, end }

          return (
            <MissingView
              key={id}
              inv={delWithId}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setCurrMissing(delWithId)}
              onMouseLeave={() => setCurrMissing(undefined)}
            />
          )
        })

        return (
          <div className="sequence-view-wrapper d-inline-flex">
            <svg className="sequence-view-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="sequence-view-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {mutationViews}
              {missingViews}
              {deletionViews}
            </svg>
            {mutation && <MutationTooltip mutation={mutation} sequence={sequence} />}
            {currMissing && <MissingTooltip inv={currMissing} sequence={sequence} />}
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}
