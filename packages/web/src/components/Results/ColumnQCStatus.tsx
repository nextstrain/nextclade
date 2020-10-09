import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { QCResult } from 'src/algorithms/QC/types'
import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfQcIssues } from 'src/components/Results/ListOfQcIsuues'
import { notUndefined } from 'src/helpers/notUndefined'
import { Circle } from 'src/components/Results/Circle'

export interface ColumnQCStatusProps {
  sequence: AnalysisResult
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
    { value: missingData, name: 'N' },
    { value: mixedSites, name: 'M' },
    { value: privateMutations, name: 'P' },
    { value: snpClusters, name: 'C' },
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
      <Tooltip wide target={id} isOpen={showTooltip}>
        <ListOfQcIssues qc={qc} />
      </Tooltip>
    </div>
  )
}
