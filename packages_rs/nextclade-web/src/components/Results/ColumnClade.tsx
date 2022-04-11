import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'src/components/Results/Tooltip'

export interface ColumnCladeProps {
  sequence: AnalysisResult
}

export function ColumnClade({ sequence }: ColumnCladeProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { clade, seqName } = sequence
  const id = getSafeId('col-clade', { seqName })
  const cladeText = clade ?? t('Pending...')

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {cladeText}
      <Tooltip id={id} isOpen={showTooltip} target={id}>
        <div>{t('Clade: {{cladeText}}', { cladeText })}</div>
      </Tooltip>
    </div>
  )
}
