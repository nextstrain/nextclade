import React from 'react'

import type { NucleotideSubstitution } from 'src/algorithms/types'
import { NucleotideMutationBadge } from 'src/components/Common/MutationBadge'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'

export interface ListOfMutationsProps {
  substitutions: NucleotideSubstitution[]
}

export function ListOfMutations({ substitutions }: ListOfMutationsProps) {
  const { t } = useTranslationSafe()

  const totalMutations = substitutions.length
  const maxRows = 8
  const substitutionsSelected = substitutions.slice(0, 64)
  const columns = splitToRows(substitutionsSelected, { rowLength: maxRows })

  let moreText
  if (totalMutations > substitutionsSelected.length) {
    moreText = t('(truncated)')
  }

  return (
    <>
      <tr>
        <td colSpan={2}>{t('Nucleotide mutations ({{totalMutations}})', { totalMutations })}</td>
      </tr>

      <tr>
        <td colSpan={2}>
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
                  <td colSpan={maxRows} className="text-center">
                    {moreText}
                  </td>
                </tr>
              )}
            </tbody>
          </TableSlim>
        </td>
      </tr>
    </>
  )
}
