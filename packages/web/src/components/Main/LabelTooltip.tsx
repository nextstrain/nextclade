import React from 'react'

import { Popover, PopoverBody } from 'reactstrap'
import type { DeepReadonly } from 'ts-essentials'

import type { AnalysisResult } from 'src/algorithms/run'
import type { SubstringMatch } from 'src/algorithms/findCharacterRanges'

import { formatRange } from './formatRange'

export function getSequenceIdentifier(seqName: string) {
  return CSS.escape(`${seqName.replace(/(\W+)/g, '-')}`)
}

export function calculateNucleotidesTotals(invalid: DeepReadonly<SubstringMatch[]>, character: string) {
  return invalid
    .filter((inv) => inv.character === character)
    .reduce((total, inv) => total + inv.range.end - inv.range.begin, 0)
}

export interface LabelTooltipProps {
  showTooltip: boolean
  sequence: AnalysisResult
}

export function LabelTooltip({ sequence, showTooltip }: LabelTooltipProps) {
  const {
    seqName,
    clades,
    mutations,
    deletions,
    insertions,
    invalid,
    alnStart,
    alnEnd,
    alignmentScore,
    diagnostics,
  } = sequence
  const id = getSequenceIdentifier(seqName)
  const cladesList = Object.keys(clades).join(', ')
  const alnStartOneBased = alnStart + 1
  const alnEndOneBased = alnEnd + 1

  const mutationItems = Object.entries(mutations).map(([positionZeroBased, allele]) => {
    const positionOneBased = Number.parseInt(positionZeroBased, 10) + 1
    const key = `${positionOneBased} ${allele}`
    return <li key={key}>{key}</li>
  })

  const gapItems = invalid.map((inv) => {
    const { character, range: { begin, end } } = inv // prettier-ignore
    const range = formatRange(begin, end)
    const key = `${character}-${range}`
    return <li key={key}>{`${character} ${range}`}</li>
  })

  let flags
  if (diagnostics.flags.length > 0) {
    flags = diagnostics.flags.map((flag) => {
      return <li key={flag}>{flag}</li>
    })
  } else {
    flags = [<li key="allGood">None detected</li>]
  }

  const totalMutations = mutationItems.length
  const totalGaps = Object.values(deletions).reduce((a, b) => a + b, 0)
  const totalInsertions = Object.values(insertions).reduce((a, b) => a + b.length, 0)
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
        <div>{`Alignment score ${alignmentScore}`}</div>
        <div>{`Alignment start ${alnStartOneBased}`}</div>
        <div>{`Alignment end ${alnEndOneBased}`}</div>
        <div>{`Clades ${cladesList || '--'}`}</div>
        <div>{`Total mutations: ${totalMutations}`}</div>
        <div>
          <div>{`Mutations:`}</div>
          <ul>{mutationItems}</ul>
        </div>
        <div>{`Total deletions: ${totalGaps}`}</div>
        <div>{`Total insertions: ${totalInsertions}`}</div>
        <div>{`Total Ns: ${totalNs}`}</div>
        <div>
          <div>{`Gaps and Ns`}</div>
          <ul>{gapItems}</ul>
        </div>
        <div>
          <div>{`QC issues`}</div>
          <ul>{flags}</ul>
        </div>
      </PopoverBody>
    </Popover>
  )
}
