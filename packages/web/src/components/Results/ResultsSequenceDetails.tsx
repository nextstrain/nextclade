import React, { useCallback } from 'react'

import {
  FormGroup as ReactstrapFormGroup,
  Input as ReactstrapInput,
  Label as ReactstrapLabel,
  FormGroupProps as ReactstrapFormGroupProps,
  InputProps as ReactstrapInputProps,
  LabelProps as ReactstrapLabelProps,
  Card as ReactstrapCard,
  CardBody as ReactstrapCardBody,
  CardHeader as ReactstrapCardHeader,
  CardBodyProps as ReactstrapCardBodyProps,
  CardHeaderProps as ReactstrapCardHeaderProps,
  CardProps as ReactstrapCardProps,
  Collapse,
  Button,
} from 'reactstrap'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { connect } from 'react-redux'

import type { SequenceAnylysisState } from 'src/state/algorithm/algorithm.state'
import { State } from 'src/state/reducer'
import { focusSequence } from 'src/state/algorithm/algorithm.actions'

export const Card = styled(ReactstrapCard)<ReactstrapCardProps>`
  box-shadow: 1px 1px 3px 2px rgba(128, 128, 128, 0.5);
`

export const CardHeader = styled(ReactstrapCardHeader)<ReactstrapCardHeaderProps>`
  height: 36px;
  font-size: 1rem;
  line-height: 1rem;
`

export const CardBody = styled(ReactstrapCardBody)<ReactstrapCardBodyProps>`
  display: flex;
  width: 100%;
  padding: 3px 3px;
`

const mapStateToProps = (state: State) => ({
  results: state.algorithm.results,
  focusedSequence: state.algorithm.focusedSequence,
})

const mapDispatchToProps = {
  focusSequence,
}

export const ResultsSequenceDetails = connect(mapStateToProps, mapDispatchToProps)(ResultsSequenceDetailsDisconnected)

export interface ResultsSequenceDetailsProps {
  results: SequenceAnylysisState[]
  focusedSequence?: number
  focusSequence(index?: number): void
}

export function ResultsSequenceDetailsDisconnected({
  results,
  focusedSequence,
  focusSequence,
}: ResultsSequenceDetailsProps) {
  const { t } = useTranslation()
  const closeDetailsPanel = useCallback(() => focusSequence(undefined), [focusSequence])
  const isOpen = focusedSequence !== undefined

  if (!focusedSequence) {
    return null
  }

  const sequence = results[focusedSequence]

  return (
    <Collapse isOpen={isOpen}>
      <Card>
        <CardHeader>{t('Details')}</CardHeader>

        <CardBody>
          {sequence.seqName}
          <Button onClick={closeDetailsPanel}>{t('Close')}</Button>
        </CardBody>
      </Card>
    </Collapse>
  )
}
