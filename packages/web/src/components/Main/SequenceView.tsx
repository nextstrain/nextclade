import React, { useState } from 'react'

import ReactResizeDetector from 'react-resize-detector'

import { BASE_MIN_WIDTH_PX } from 'src/constants'
import type { AnalysisResult } from 'src/algorithms/run'

import type { MutationElementWithId, MutationElement, InvalidElementWithId, InvalidElement } from './types'
import { InvalidTooltip } from './InvalidTooltip'
import { InvalidView } from './InvalidView'
import { MutationTooltip } from './MutationTooltip'
import { MutationView } from './MutationView'

export const GENOME_SIZE = 30000 as const // TODO: deduce from sequences?

export function getMutationIdentifier({ seqName, positionZeroBased, allele }: MutationElement) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}-${positionZeroBased}-${allele}`)
}

export function getInvalidIdentifier({ seqName, character, begin, end }: InvalidElement) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}-${character}-${begin}-${end}`)
}

export interface SequenceViewProps {
  sequence: AnalysisResult
}

export function SequenceView({ sequence }: SequenceViewProps) {
  const [mutation, setMutation] = useState<MutationElementWithId | undefined>(undefined)
  const [currInvalid, setCurrInvalid] = useState<InvalidElementWithId | undefined>(undefined)
  const { seqName, mutations, invalid, deletions } = sequence

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

        const invalidViews = invalid.map((inv) => {
          const { character, range } = inv
          const { begin, end } = range
          const id = getInvalidIdentifier({ seqName, character, begin, end })
          const invWithId: InvalidElementWithId = { id, seqName, character, begin, end }

          return (
            <InvalidView
              key={id}
              inv={invWithId}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setCurrInvalid(invWithId)}
              onMouseLeave={() => setCurrInvalid(undefined)}
            />
          )
        })

        const deletionViews = Object.keys(deletions).map((del) => {
          const begin = Number.parseInt(del, 10)
          const length = deletions[del]
          const end = begin + length
          const id = getInvalidIdentifier({ seqName, character: '-', begin, end })
          const delWithId: InvalidElementWithId = { id, seqName, character: '-', begin, end }

          return (
            <InvalidView
              key={id}
              inv={delWithId}
              pixelsPerBase={pixelsPerBase}
              onMouseEnter={() => setCurrInvalid(delWithId)}
              onMouseLeave={() => setCurrInvalid(undefined)}
            />
          )
        })

        return (
          <div className="sequence-view-wrapper d-inline-flex">
            <svg className="sequence-view-body" viewBox={`0 0 ${widthPx} 10`}>
              <rect className="sequence-view-background" x={0} y={-10} width={GENOME_SIZE} height="30" />
              {mutationViews}
              {invalidViews}
              {deletionViews}
            </svg>
            {mutation && <MutationTooltip mutation={mutation} sequence={sequence} />}
            {currInvalid && <InvalidTooltip inv={currInvalid} sequence={sequence} />}
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}
