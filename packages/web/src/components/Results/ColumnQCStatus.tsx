import React, { useState } from 'react'

import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import type { QCResult } from 'src/algorithms/QC/runQC'
import type { AnalysisResultState } from 'src/state/algorithm/algorithm.state'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'
import { notUndefined } from 'src/helpers/notUndefined'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

const CIRCLE_SZE_PX = 20

const statusColors = {
  [QCRuleStatus.good]: '#68b844',
  [QCRuleStatus.mediocre]: '#e4902f',
  [QCRuleStatus.bad]: '#da4e3c',
}

export const CircleBase = styled.div<{ color: string }>`
  flex: 0;
  margin: 5px auto;
  min-width: ${CIRCLE_SZE_PX}px;
  min-height: ${CIRCLE_SZE_PX}px;
  border-radius: ${CIRCLE_SZE_PX / 2}px;
  background-color: ${(props) => props.color};
  color: ${(props) => props.theme.gray100};
  font-size: 0.66rem;
  box-shadow: ${(props) => props.theme.shadows.slight}

  text-align: center;
  vertical-align: middle;
  line-height: ${CIRCLE_SZE_PX}px;
`

export interface CircleProps {
  status: QCRuleStatus
  text: string
}

export function Circle({ status, text }: CircleProps) {
  const color = statusColors[status]

  return <CircleBase color={color}>{text}</CircleBase>
}

export interface ColumnQCStatusProps {
  sequence: AnalysisResultState
  qc?: QCResult
}

export function ColumnQCStatus({ sequence, qc }: ColumnQCStatusProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { seqName } = sequence
  const id = getSafeId('qc-label', { seqName })

  if (!qc) {
    return (
      <div id={id} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
        {t('Pending...')}
        <Tooltip target={id} isOpen={showTooltip}>
          {t('Sequence quality control has not yet completed')}
        </Tooltip>
      </div>
    )
  }

  const { missingData, privateMutations, mixedSites, snpClusters } = qc

  const rules = [
    { value: missingData, name: 'MD' },
    { value: mixedSites, name: 'MS' },
    { value: privateMutations, name: 'PM' },
    { value: snpClusters, name: 'MC' },
  ].filter((value) => notUndefined(value))

  const icons = rules.map(({ name, value }, i) => {
    if (!value) {
      return undefined
    }

    return <Circle key={i} status={value.status} text={name} /> // eslint-disable-line react/no-array-index-key
  })

  return (
    <div
      id={id}
      className="d-flex w-100 h-100"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {icons}
      <Tooltip target={id} isOpen={showTooltip}>
        <ListOfQcIssues qc={qc} />
      </Tooltip>
    </div>
  )
}
