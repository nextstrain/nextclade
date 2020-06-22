import React, { useState } from 'react'

import ReactResizeDetector from 'react-resize-detector'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { AnalysisResult } from 'src/algorithms/types'

import type { MutationElementWithId, MutationElement, MissingElementWithId, MissingElement } from './types'
import { MissingTooltip } from './MissingTooltip'
import { MissingView } from './MissingView'
import { MutationTooltip } from './MutationTooltip'
import { MutationView } from './MutationView'

export const GENOME_SIZE = 30000 as const // TODO: deduce from sequences?

export function getMutationIdentifier({ seqName, positionZeroBased, allele }: MutationElement) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}-${positionZeroBased}-${allele}`)
}

export function getMissingIdentifier({ seqName, character, begin, end }: MissingElement) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}-${character}-${begin}-${end}`)
}

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

        const mutationViews = Object.entries(substitutions).map(([positionZeroBased, allele]) => {
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

        const missingViews = missing.map((inv) => {
          const { character, range } = inv
          const { begin, end } = range
          const id = getMissingIdentifier({ seqName, character, begin, end })
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

        const deletionViews = Object.keys(deletions).map((del) => {
          const begin = Number.parseInt(del, 10)
          const length = deletions[del]
          const end = begin + length
          const id = getMissingIdentifier({ seqName, character: '-', begin, end })
          const delWithId: MissingElementWithId = { id, seqName, character: '-', begin, end }

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
