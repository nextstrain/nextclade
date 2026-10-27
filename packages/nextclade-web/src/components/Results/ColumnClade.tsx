import React, { useCallback, useState } from 'react'

import type { AnalysisResult } from 'src/types'
import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import { Tooltip } from 'src/components/Results/Tooltip'
import { CladeColorValue } from 'src/components/Results/CladeColorSwatch'
import type { CladeColor } from 'src/components/Results/cladeColor'

export interface ColumnCladeProps {
  analysisResult: AnalysisResult
  /** How the tree draws the tips of the clade, if the tree is ready */
  color: CladeColor | undefined
}

export function ColumnClade({ analysisResult, color }: ColumnCladeProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { clade, seqName, index } = analysisResult
  const id = getSafeId('col-clade', { index, seqName })
  const cladeText = clade ?? ''

  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <CladeColorValue value={cladeText} color={color} />
      <Tooltip id={id} isOpen={showTooltip} target={id}>
        <div>{t('Clade: {{cladeText}}', { cladeText })}</div>
      </Tooltip>
    </div>
  )
}
