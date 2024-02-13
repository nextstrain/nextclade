import React from 'react'

import type { NucSub } from 'src/types'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'

export interface ListOfMutationsGenericProps {
  substitutions: NucSub[]
}

export function ListOfMutationsGeneric({ substitutions }: ListOfMutationsGenericProps) {
  const { t } = useTranslationSafe()

  const totalMutations = substitutions.length
  const maxRows = Math.min(8, totalMutations)
  const numCols = 8
  const substitutionsSelected = substitutions.slice(0, maxRows * numCols)
  const columns = splitToRows(substitutionsSelected, { rowLength: maxRows })

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
                  <td key={item.pos}>{<NucleotideMutationBadge mutation={item} />}</td>
                ))}
              </tr>
            ))}

            {moreText && (
              <tr>
                <td colSpan={numCols} className="text-center">
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
