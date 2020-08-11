import React from 'react'
import { Popover, PopoverBody } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { AnalysisResult } from 'src/algorithms/types'
import type { QCResult } from 'src/algorithms/QC/runQC'
import { getSafeId } from 'src/helpers/getSafeId'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'
import { formatClades } from 'src/helpers/formatClades'
import { ListOfMutations } from 'src/components/Results/ListOfMutations'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'
import { ListOfAminoacidChanges } from 'src/components/SequenceView/ListOfAminoacidChanges'
import { ListOfNonACGTNs } from 'src/components/Results/ListOfNonACGTNs'
import { ListOfInsertions } from './ListOfInsertions'

export interface ColumnNameTooltipProps {
  showTooltip: boolean
  sequence: AnalysisResult
  qc: QCResult
}

export function ColumnNameTooltip({ sequence, qc, showTooltip }: ColumnNameTooltipProps) {
  const {
    seqName,
    clades,
    substitutions,
    aminoacidChanges,
    deletions,
    insertions,
    missing,
    totalMissing,
    nonACGTNs,
    totalNonACGTNs,
    alignmentStart,
    alignmentEnd,
    alignmentScore,
  } = sequence
  const { t } = useTranslation()

  const id = getSafeId('sequence-label', { seqName })
  const { cladeListStr } = formatClades(clades)
  const alnStartOneBased = alignmentStart + 1
  const alnEndOneBased = alignmentEnd + 1

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
        <div className="mb-4">{t('Sequence: {{seqName}}', { seqName })}</div>

        <div className="my-2">{t('Alignment score: {{alignmentScore}}', { alignmentScore })}</div>
        <div className="my-2">{t('Alignment start: {{alnStart}}', { alnStart: alnStartOneBased })}</div>
        <div className="my-2">{t('Alignment end: {{alnEnd}}', { alnEnd: alnEndOneBased })}</div>
        <div className="my-2">{t('Clade: {{cladeListStr}}', { cladeListStr })}</div>

        <ListOfMutations substitutions={substitutions} />
        <ListOfAminoacidChanges aminoacidChanges={aminoacidChanges} />
        <ListOfGaps deletions={deletions} />
        <ListOfMissing missing={missing} totalMissing={totalMissing} />
        <ListOfInsertions insertions={insertions} />
        <ListOfNonACGTNs nonACGTNs={nonACGTNs} totalNonACGTNs={totalNonACGTNs} />
        {qc && <ListOfQcIssues qc={qc} />}
      </PopoverBody>
    </Popover>
  )
}
