import React from 'react'
import { Row, Col } from 'reactstrap'
import { useTranslation } from 'react-i18next'

import type { AnalysisResultState } from 'src/state/algorithm/algorithm.state'
import { formatRange } from 'src/helpers/formatRange'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'
import { ListOfMutations } from 'src/components/Results/ListOfMutations'
import { ListOfAminoacidChanges } from 'src/components/SequenceView/ListOfAminoacidChanges'
import { ListOfNonACGTNs } from 'src/components/Results/ListOfNonACGTNs'
import { ListOfInsertions } from './ListOfInsertions'

export interface ColumnNameTooltipProps {
  sequence: AnalysisResultState
}

export function ColumnNameTooltip({ sequence }: ColumnNameTooltipProps) {
  const {
    seqName,
    clade,
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
          <ListOfAminoacidChanges aminoacidChanges={aminoacidChanges} />
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
