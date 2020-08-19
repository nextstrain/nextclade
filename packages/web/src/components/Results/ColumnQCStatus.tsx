import React, { useState } from 'react'

import { MdCheck, MdClear } from 'react-icons/md'
import { useTranslation } from 'react-i18next'

import type { QCResult } from 'src/algorithms/QC/runQC'
import type { AnalysisResultState } from 'src/state/algorithm/algorithm.state'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'

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

  const { score } = qc
  const hasIssues = score > 0
  const iconRed = <MdClear className="icon fill-red" />
  const iconGreen = <MdCheck className="icon fill-green" />

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {hasIssues ? iconRed : iconGreen}
      <Tooltip target={id} isOpen={showTooltip}>
        <ListOfQcIssues qc={qc} />
      </Tooltip>
    </div>
  )
}
