import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'

import { getSafeId } from 'src/helpers/getSafeId'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'src/components/Results/Tooltip'
import { formatClades } from 'src/helpers/formatClades'

export interface ColumnCladeProps {
  sequence: AnalysisResult
}

export function ColumnClade({ sequence }: ColumnCladeProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)

  const { clades, seqName } = sequence
  const id = getSafeId('col-clade', { seqName })
  const { cladeStr, cladeListStr } = formatClades(clades)

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {cladeStr}
      <Tooltip id={id} isOpen={showTooltip} target={id}>
        <div>{t('Clade: {{cladeListStr}}', { cladeListStr })}</div>
      </Tooltip>
    </div>
  )
}
