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
  const { clade, cladeList } = formatClades(clades)

  return (
    <td
      id={id}
      className="results-table-col results-table-col-clade"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {clade}
      <Tooltip id={id} isOpen={showTooltip} target={id}>
        <div>{t('Clades: {{cladeList}}', { cladeList })}</div>
      </Tooltip>
    </td>
  )
}
