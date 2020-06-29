import React from 'react'
import { Popover, PopoverBody } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { AminoacidSubstitution, AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'
import { formatClades } from 'src/helpers/formatClades'
import { ListOfMutations } from 'src/components/Results/ListOfMutations'
import { getTotalMissing } from 'src/components/Results/getTotalMissing'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'
import { ListOfAminoacidChanges } from 'src/components/SequenceView/ListOfAminoacidChanges'

export interface ColumnNameTooltipProps {
  showTooltip: boolean
  sequence: AnalysisResult
}

export function ColumnNameTooltip({ sequence, showTooltip }: ColumnNameTooltipProps) {
  const {
    seqName,
    clades,
    substitutions,
    deletions,
    insertions,
    missing,
    alignmentStart,
    alignmentEnd,
    alignmentScore,
    diagnostics,
  } = sequence
  const { t } = useTranslation()

  const id = getSafeId('sequence-label', { seqName })
  const { clade, cladeList } = formatClades(clades)
  const alnStartOneBased = alignmentStart + 1
  const alnEndOneBased = alignmentEnd + 1

  const aminoacidChanges = substitutions.reduce(
    (result, { aaSubstitutions }) => [...result, ...aaSubstitutions],
    [] as AminoacidSubstitution[],
  )

  const totalMutations = substitutions.length
  const totalGaps = deletions.reduce((acc, curr) => acc + curr.length, 0)
  const totalMissing = getTotalMissing(missing)
  const totalInsertions = insertions.length

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
        <div>{t('Sequence: {{seqName}}', { seqName })}</div>
        <div>{t('Alignment score: {{alignmentScore}}', { alignmentScore })}</div>
        <div>{t('Alignment start: {{alnStart}}', { alnStart: alnStartOneBased })}</div>
        <div>{t('Alignment end: {{alnEnd}}', { alnEnd: alnEndOneBased })}</div>

        <div>{t('Clade: {{clade}}', { clade })}</div>
        <div>{t('Clades: {{cladeList}}', { cladeList })}</div>

        <div>{t('Total mutations: {{totalMutations}}', { totalMutations })}</div>
        <ListOfMutations substitutions={substitutions} />

        <ListOfAminoacidChanges aminoacidChanges={aminoacidChanges} />

        <div>{`Total gaps: ${totalGaps}`}</div>
        <ListOfGaps deletions={deletions} />

        <div>{`Total insertions: ${totalInsertions}`}</div>

        <div>{`Total missing: ${totalMissing}`}</div>
        <ListOfMissing missing={missing} />

        <ListOfQcIssues diagnostics={diagnostics} />
      </PopoverBody>
    </Popover>
  )
}
