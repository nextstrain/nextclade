import React, { useCallback, useState } from 'react'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Tooltip } from 'src/components/Results/Tooltip'

export interface ColumnCladeProps {
  analysisResult: AnalysisResult
}

export function ColumnClade({ analysisResult }: ColumnCladeProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { clade, seqName, index } = analysisResult
  const id = getSafeId('col-clade', { index, seqName })
  const cladeText = clade ?? ''

  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {cladeText}
      <Tooltip id={id} isOpen={showTooltip} target={id}>
        <div>{t('Clade: {{cladeText}}', { cladeText })}</div>
      </Tooltip>
    </div>
  )
}
