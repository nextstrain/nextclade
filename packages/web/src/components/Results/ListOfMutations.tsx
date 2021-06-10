import React from 'react'

import type { NucleotideSubstitution } from 'src/algorithms/types'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'
import { formatMutation } from 'src/helpers/formatMutation'
import { splitToRows } from 'src/components/Results/splitToRows'
import { TableSlim } from 'src/components/Common/TableSlim'

export interface ListOfMutationsProps {
  substitutions: NucleotideSubstitution[]
}

export function ListOfMutations({ substitutions }: ListOfMutationsProps) {
  const { t } = useTranslationSafe()

  const totalMutations = substitutions.length
  const maxRows = 6
  const substitutionsSelected = substitutions.slice(0, 20)
  const columns = splitToRows(substitutionsSelected, { maxRows })

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
                    <td key={item.pos}>{formatMutation(item)}</td>
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
