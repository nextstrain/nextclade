import React from 'react'
import { useRecoilValue } from 'recoil'
import copy from 'fast-copy'

import type { AminoacidDeletion } from 'src/types'
import { formatAADeletion } from 'src/helpers/formatMutation'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { geneOrderPreferenceAtom } from 'src/state/dataset.state'
import { sortByGenes } from './sortByGenes'

export interface ListOfAminoacidDeletionsProps {
  aminoacidDeletions: AminoacidDeletion[]
}

export function ListOfAminoacidDeletions({ aminoacidDeletions }: ListOfAminoacidDeletionsProps) {
  const { t } = useTranslationSafe()

  const geneOrderPreference = useRecoilValue(geneOrderPreferenceAtom)

  const totalDeletions = aminoacidDeletions.length
  const maxRows = 6
  const deletionsSelected = copy(aminoacidDeletions).sort(sortByGenes(geneOrderPreference)).slice(0, 90)

  const columns = splitToRows(deletionsSelected, { maxRows })

  let moreText
  if (totalDeletions > deletionsSelected.length) {
    moreText = t('(truncated)')
  }

  return (
    <div className="d-flex">
      <div className="mr-auto">
        <TableSlim>
          <tbody>
            {columns.map((col, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={i}>
                {col.map((item) => (
                  <td key={formatAADeletion(item)}>
                    <AminoacidMutationBadge mutation={item} />
                  </td>
                ))}
              </tr>
            ))}

            {moreText && (
              <tr>
                <td colSpan={maxRows} className="text-center">
                  {moreText}
                </td>
              </tr>
            )}
          </tbody>
        </TableSlim>
      </div>
    </div>
  )
}
