import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'

import type { AnalysisResult } from 'src/algorithms/run'
import type { SubstringMatch } from 'src/algorithms/findCharacterRanges'

import { formatRange } from './formatRange'

export function getSequenceIdentifier(seqName: string) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}`)
}

export function calculateNucleotidesTotals(invalid: SubstringMatch[], character: string) {
  return invalid
    .filter((inv) => inv.character === character)
    .reduce((total, inv) => total + inv.range.end - inv.range.begin, 0)
}

export interface LabelTooltipProps {
  showTooltip: boolean
  sequence: AnalysisResult
}

export function LabelTooltip({ sequence, showTooltip }: LabelTooltipProps) {
  const { seqName, clades, mutations, invalid, alnStart, alnEnd } = sequence
  const id = getSequenceIdentifier(seqName)
  const cladesList = Object.keys(clades).join(', ')
  const alnStartOneBased = alnStart + 1
  const alnEndOneBased = alnEnd + 1

  const mutationItems = Object.entries(mutations).map(([positionZeroBased, allele]) => {
    const positionOneBased = Number.parseInt(positionZeroBased, 10) + 1
    const key = `${positionOneBased} ${allele}`
    return <li key={key}>{key}</li>
  })

  const cladeMutationItems = Object.entries(clades).map(([key, values]) => (
    <li key={key}>
      {key}
      <ul>
        {values.map(({ pos, allele }) => (
          <li key={pos}>{`pos: ${pos + 1}, allele: ${allele}`}</li>
        ))}
      </ul>
    </li>
  ))

  const gapItems = invalid.map((inv) => {
    const { character, range: { begin, end } } = inv // prettier-ignore
    const range = formatRange(begin, end)
    const key = `${character}-${range}`
    return <li key={key}>{`${character} ${range}`}</li>
  })

  const totalMutations = mutationItems.length
  const totalGaps = calculateNucleotidesTotals(invalid, '-')
  const totalNs = calculateNucleotidesTotals(invalid, 'N')

  return (
    <Popover
      className="popover-mutation"
      target={id}
      placement="auto"
      isOpen={showTooltip}
      hideArrow
      delay={0}
      fade={false}
    >
      <PopoverBody>
        <div>{`Sequence ${seqName}`}</div>
        <div>{`Clades ${cladesList}`}</div>
        <div>{`Alignment start ${alnStartOneBased}`}</div>
        <div>{`Alignment end ${alnEndOneBased}`}</div>
        <div>{`Total mutations: ${totalMutations}`}</div>
        <div>
          <div>{`Mutations:`}</div>
          <ul>{mutationItems}</ul>
        </div>
        <div>
          <div>{`Mutations per clade:`}</div>
          <ul>{cladeMutationItems}</ul>
        </div>
        <div>{`Total gaps: ${totalGaps}`}</div>
        <div>{`Total Ns: ${totalNs}`}</div>
        <div>
          <div>{`Gaps and Ns`}</div>
          <ul>{gapItems}</ul>
        </div>
      </PopoverBody>
    </Popover>
  )
}
