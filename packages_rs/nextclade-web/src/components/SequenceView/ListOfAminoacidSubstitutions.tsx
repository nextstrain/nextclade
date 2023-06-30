import React from 'react'
import { useRecoilValue } from 'recoil'
import copy from 'fast-copy'

import type { AaSub } from 'src/types'
import { geneOrderPreferenceAtom } from 'src/state/dataset.state'
import { formatAAMutation } from 'src/helpers/formatMutation'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { sortByCdsName } from './sortByCdsName'

export interface ListOfAminoacidMutationsProps {
  aminoacidSubstitutions: AaSub[]
}

export function ListOfAminoacidSubstitutions({ aminoacidSubstitutions }: ListOfAminoacidMutationsProps) {
  const { t } = useTranslationSafe()

  const geneOrderPreference = useRecoilValue(geneOrderPreferenceAtom)

  const totalMutations = aminoacidSubstitutions.length
  const maxRows = Math.min(8, totalMutations)
  const numCols = 8
  const substitutionsSelected = copy(aminoacidSubstitutions)
    .sort(sortByCdsName(geneOrderPreference))
    .slice(0, maxRows * numCols)

  const columns = splitToRows(substitutionsSelected, { maxRows })

  let moreText
  if (totalMutations > substitutionsSelected.length) {
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
                  <td key={formatAAMutation(item)}>
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
