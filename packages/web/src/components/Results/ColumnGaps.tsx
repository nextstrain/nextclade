import React, { useState } from 'react'

import type { AnalysisResult } from 'src/algorithms/types'
import { TableSlim } from 'src/components/Common/TableSlim'
import { ListOfAminoacidDeletions } from 'src/components/SequenceView/ListOfAminoacidDeletions'
import { getSafeId } from 'src/helpers/getSafeId'
import { Tooltip } from 'src/components/Results/Tooltip'
import { ListOfGaps } from 'src/components/Results/ListOfGaps'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface ColumnGapsProps {
  sequence: AnalysisResult
}

export function ColumnGaps({ sequence }: ColumnGapsProps) {
  const { t } = useTranslationSafe()
  const [showTooltip, setShowTooltip] = useState(false)

  const { deletions, aaDeletions, seqName } = sequence
  const id = getSafeId('col-gaps', { seqName })

  const totalGaps = deletions.reduce((acc, curr) => acc + curr.length, 0)

  return (
    <div id={id} className="w-100" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
      {totalGaps}
      <Tooltip isOpen={showTooltip} target={id} wide fullWidth>
        <TableSlim borderless className="mb-1">
          <tbody>
            <tr>
              <th>{t('Nucleotide deletions ({{n}})', { n: totalGaps })}</th>
            </tr>
            <tr>
              <td>
                <ListOfGaps deletions={deletions} />
              </td>
            </tr>

            <tr>
              <th>{t('Aminoacid deletions ({{n}})', { n: aaDeletions.length })}</th>
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
