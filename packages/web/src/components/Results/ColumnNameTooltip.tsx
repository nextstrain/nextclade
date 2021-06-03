import React from 'react'

import { Row, Col, Alert as ReactstrapAlert } from 'reactstrap'
import styled from 'styled-components'

import type { AnalysisResult } from 'src/algorithms/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { formatRange } from 'src/helpers/formatRange'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'
import { ListOfMissing } from 'src/components/Results/ListOfMissing'
import { ListOfMutations } from 'src/components/Results/ListOfMutations'
import { ListOfNonACGTNs } from 'src/components/Results/ListOfNonACGTNs'
import { ListOfAminoacidSubstitutions } from 'src/components/SequenceView/ListOfAminoacidSubstitutions'
import { ListOfAminoacidDeletions } from 'src/components/SequenceView/ListOfAminoacidDeletions'
import { ListOfPcrPrimerChanges } from 'src/components/SequenceView/ListOfPcrPrimerChanges'
import { ErrorIcon, getStatusIconAndText, WarningIcon } from 'src/components/Results/getStatusIconAndText'
import { ListOfInsertions } from './ListOfInsertions'

const Alert = styled(ReactstrapAlert)`
  box-shadow: ${(props) => props.theme.shadows.slight};
`

export interface ColumnNameTooltipInfoProps {
  sequence: AnalysisResult
}

export function ColumnNameTooltipInfo({ sequence }: ColumnNameTooltipInfoProps) {
  const { t } = useTranslationSafe()

  const {
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

  const alnStartOneBased = alignmentStart + 1
  const alnEndOneBased = alignmentEnd + 1
  const cladeText = clade ?? t('Pending...')

  return (
    <>
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
    </>
  )
}

export interface ColumnNameTooltipProps {
  seqName: string
  sequence?: AnalysisResult
  warnings: string[]
  errors: string[]
}

export function ColumnNameTooltip({ seqName, sequence, warnings, errors }: ColumnNameTooltipProps) {
  const { t } = useTranslationSafe()

  const { StatusIcon, statusText } = getStatusIconAndText({
    t,
    isDone: !!sequence,
    hasWarnings: warnings.length > 0,
    hasErrors: errors.length > 0,
  })

  return (
    <div>
      <Row noGutters>
        <Col>
          <h6 className="mb-2">{t('Sequence: {{seqName}}', { seqName })}</h6>
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          {t('Analysis status: ')}
          <StatusIcon />
          {statusText}
        </Col>
      </Row>

      <Row noGutters>
        <Col>
          {warnings.map((warning) => (
            <Alert key={warning} color="warning" fade={false} className="px-2 py-1 my-1">
              <WarningIcon />
              {warning}
            </Alert>
          ))}

          {errors.map((error) => (
            <Alert key={error} color="danger" fade={false} className="px-2 py-1 my-1">
              <ErrorIcon />
              {error}
            </Alert>
          ))}
        </Col>
      </Row>

      {sequence && <ColumnNameTooltipInfo sequence={sequence} />}
    </div>
  )
}
