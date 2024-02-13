import React, { useCallback, useState } from 'react'

import type { AnalysisResult } from 'src/types'
import { rangeLen } from 'src/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ListOfAminoacidDeletions } from 'src/components/SequenceView/ListOfAminoacidDeletions'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface ColumnGapsProps {
  analysisResult: AnalysisResult
}

export function ColumnGaps({ analysisResult }: ColumnGapsProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)
  const onMouseEnter = useCallback(() => setShowTooltip(true), [])
  const onMouseLeave = useCallback(() => setShowTooltip(false), [])

  const { index, deletions, aaDeletions, seqName } = analysisResult
  const id = getSafeId('col-gaps', { index, seqName })

  const totalGaps = deletions.reduce((acc, curr) => acc + rangeLen(curr.range), 0)

  return (
    <div id={id} className="w-100" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {totalGaps}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <tbody>
            <tr>
              <th>{t('Nucleotide deletions ({{ n }})', { n: totalGaps })}</th>
            </tr>
            <tr>
              <td>
                <ListOfGaps deletions={deletions} />
              </td>
            </tr>

            <tr>
              <th>{t('Aminoacid deletions ({{ n }})', { n: aaDeletions.length })}</th>
            </tr>
            <tr>
              <td>
                <ListOfAminoacidDeletions aminoacidDeletions={aaDeletions} />
              </td>
            </tr>
          </tbody>
        </TableSlim>
      </Tooltip>
    </div>
  )
}
