import React from 'react'
import { Row, Col } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { AnalysisResult } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'
import { ListOfMutations } from 'src/components/Results/ListOfMutations'
import { ListOfNonACGTNs } from 'src/components/Results/ListOfNonACGTNs'
import { ListOfAminoacidSubstitutions } from 'src/components/SequenceView/ListOfAminoacidSubstitutions'
import { ListOfAminoacidDeletions } from 'src/components/SequenceView/ListOfAminoacidDeletions'
import { ListOfPcrPrimerChanges } from 'src/components/SequenceView/ListOfPcrPrimerChanges'
import { ListOfInsertions } from './ListOfInsertions'

export interface ColumnNameTooltipProps {
  sequence: AnalysisResult
}

export function ColumnNameTooltip({ sequence }: ColumnNameTooltipProps) {
  const {
    seqName,
    clade,
    substitutions,
    deletions,
    insertions,
    missing,
    totalMissing,
    nonACGTNs,
    totalNonACGTNs,
    aaSubstitutions,
    aaDeletions,
    alignmentStart,
    alignmentEnd,
    alignmentScore,
    pcrPrimerChanges,
    totalPcrPrimerChanges,
  } = sequence
  const { t } = useTranslation()

  const alnStartOneBased = alignmentStart + 1
  const alnEndOneBased = alignmentEnd + 1
  const cladeText = clade ?? t('Pending...')

  return (
    <div>
      <Row noGutters>
        <Col>
          <h5 className="mb-2">{t('Sequence: {{seqName}}', { seqName })}</h5>
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          <div className="my-1">{t('Clade: {{cladeText}}', { cladeText })}</div>
          <div className="my-1">
            {t('Alignment: {{range}} (score: {{alignmentScore}})', {
              range: formatRange(alnStartOneBased, alnEndOneBased),
              alignmentScore,
            })}
          </div>
        </Col>
      </Row>

      <Row noGutters>
        <Col lg={6}>
          <ListOfMutations substitutions={substitutions} />
        </Col>
        <Col lg={6}>
          <ListOfAminoacidSubstitutions aminoacidSubstitutions={aaSubstitutions} />
          <ListOfAminoacidDeletions aminoacidDeletions={aaDeletions} />
          <ListOfPcrPrimerChanges pcrPrimerChanges={pcrPrimerChanges} totalPcrPrimerChanges={totalPcrPrimerChanges} />
        </Col>
      </Row>

      <Row noGutters>
        <Col lg={6}>
          <ListOfGaps deletions={deletions} />
          <ListOfMissing missing={missing} totalMissing={totalMissing} />
        </Col>
        <Col lg={6}>
          <ListOfInsertions insertions={insertions} />
          <ListOfNonACGTNs nonACGTNs={nonACGTNs} totalNonACGTNs={totalNonACGTNs} />
        </Col>
      </Row>
    </div>
  )
}
