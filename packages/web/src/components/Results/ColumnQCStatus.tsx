import React, { useState } from 'react'

import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { GiPlainCircle } from 'react-icons/gi'

import type { QCResult } from 'src/algorithms/QC/runQC'
import type { AnalysisResultState } from 'src/state/algorithm/algorithm.state'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'
import { notUndefined } from 'src/helpers/notUndefined'
import { QCRuleStatus } from 'src/algorithms/QC/QCRuleStatus'

const CIRCLE_SZE_PX = 20

export const Circle = styled(GiPlainCircle)`
  width: ${CIRCLE_SZE_PX}px;
  height: ${CIRCLE_SZE_PX}px;
`

export const CircleRed = styled(Circle)`
  color: ${(props) => props.theme.red};
`

export const CircleOrange = styled(Circle)`
  color: ${(props) => props.theme.orange};
`

export const CircleGreen = styled(Circle)`
  color: ${(props) => props.theme.green};
`

const statusIcons = {
  [QCRuleStatus.good]: <CircleGreen />,
  [QCRuleStatus.mediocre]: <CircleOrange />,
  [QCRuleStatus.bad]: <CircleRed />,
} as const

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

  const icons = [missingData, mixedSites, privateMutations, snpClusters]
    .filter(notUndefined)
    .map(({ status }) => statusIcons[status])

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {icons}
      <Tooltip target={id} isOpen={showTooltip}>
        <ListOfQcIssues qc={qc} />
      </Tooltip>
    </div>
  )
}
