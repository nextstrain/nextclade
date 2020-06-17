import React, { SVGProps, useState } from 'react'

import { get } from 'lodash'

import ReactResizeDetector from 'react-resize-detector'
import { Table, Popover, PopoverBody, PopoverHeader } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { AlgorithmResult, AnalyzeSeqResult, Substitutions } from 'src/algorithms/run'

export type ResultProps = AlgorithmResult

const GENOME_SIZE = 30000 as const
const BASE_MIN_WIDTH_PX = 4 as const

const BASE_COLORS = {
  A: '#1167b7',
  T: '#ad871c',
  G: '#79ac34',
  C: '#d04343',
  N: '#222222',
} as const

export function getBaseColor(allele: string) {
  return get(BASE_COLORS, allele) ?? BASE_COLORS.N
}

export interface MutationElement {
  seqName: string
  position: string
  allele: string
}

export interface MutationElementWithId extends MutationElement {
  id: string
}

export function getMutationIdentifier({ seqName, position, allele }: MutationElement) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}-${position}-${allele}`)
}

export interface MutationViewProps extends SVGProps<SVGRectElement> {
  mutation: MutationElementWithId
  pixelsPerBase: number
  width: number
}

export function MutationView({ mutation, pixelsPerBase, width, onClick, ...rest }: MutationViewProps) {
  const { id, position, allele } = mutation
  const fill = getBaseColor(allele)
  const x = Number.parseInt(position, 10) * pixelsPerBase
  return <rect id={id} fill={fill} x={x} y={-10} width={width} height="30" {...rest} />
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

        const mutationViews = Object.entries(mutations).map(([position, allele]) => {
          const id = getMutationIdentifier({ seqName, position, allele })
          const mutation: MutationElementWithId = { id, seqName, position, allele }
          return (
            <MutationView
              key={position}
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
            {mutation && (
              <Popover
                className="popover-mutation"
                target={mutation.id}
                placement="auto"
                isOpen
                hideArrow
                delay={0}
                fade={false}
              >
                <PopoverBody>
                  <p>{`Sequence ${mutation.seqName}`}</p>
                  <p>{`Position ${mutation.position}`}</p>
                  <p>{`Allele ${mutation.allele}`}</p>
                </PopoverBody>
              </Popover>
            )}
          </div>
        )
      }}
    </ReactResizeDetector>
  )
}

export function Result({ result }: ResultProps) {
  const { t } = useTranslation()

  if (!result) {
    return null
  }

  const rows = result.map((sequence, i) => {
    const clades = Object.keys(sequence.clades).join(', ')

    return (
      <tr className="results-table-row" key={sequence.seqName}>
        <td className="results-table-col results-table-col-label">{sequence.seqName}</td>
        <td className="results-table-col results-table-col-clade">{clades}</td>
        <td className="results-table-col results-table-col-mutations">
          <SequenceView key={sequence.seqName} sequence={sequence} />
        </td>
      </tr>
    )
  })

  return (
    <Table className="results-table">
      <tr className="results-table-row">
        <th className="results-table-header">{t('Sequence name')}</th>
        <th className="results-table-header">{t('Clades')}</th>
        <th className="results-table-header">{t('Mutations')}</th>
      </tr>
      {rows}
    </Table>
  )
}
