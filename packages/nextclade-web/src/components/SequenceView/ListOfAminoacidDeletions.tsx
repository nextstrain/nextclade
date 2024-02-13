import React from 'react'
import { useRecoilValue } from 'recoil'
import copy from 'fast-copy'

import type { AaDel, AaSub } from 'src/types'
import { formatAADeletion } from 'src/helpers/formatMutation'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { cdsOrderPreferenceAtom } from 'src/state/dataset.state'
import { sortByCdsName } from './sortByCdsName'

export interface ListOfAminoacidDeletionsProps {
  aminoacidDeletions: AaDel[]
}

export function ListOfAminoacidDeletions({ aminoacidDeletions }: ListOfAminoacidDeletionsProps) {
  const { t } = useTranslationSafe()

  const geneOrderPreference = useRecoilValue(cdsOrderPreferenceAtom)

  const totalDeletions = aminoacidDeletions.length
  const maxRows = 6
  const deletionsSelected: AaSub[] = copy(aminoacidDeletions)
    .sort(sortByCdsName(geneOrderPreference))
    .slice(0, 90)
    .map((del) => ({
      ...del,
      qryAa: '-',
    }))

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
