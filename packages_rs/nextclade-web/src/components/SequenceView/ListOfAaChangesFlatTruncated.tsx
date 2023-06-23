import React from 'react'

import { AaSub } from 'src/types'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { TableSlim } from 'src/components/Common/TableSlim'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface ListOfMutationsTruncatedProps {
  aaChanges: AaSub[]
  maxRows?: number
}

export function ListOfAaChangesFlatTruncated({ aaChanges, maxRows = 6 }: ListOfMutationsTruncatedProps) {
  const { t } = useTranslationSafe()

  let changesHead = aaChanges
  let changesTail: typeof aaChanges = []
  if (aaChanges.length > maxRows) {
    changesHead = aaChanges.slice(0, (maxRows + 1) / 2)
    changesTail = aaChanges.slice(-maxRows / 2)
  }

  return (
    <TableSlim borderless className="mb-1">
      <thead />
      <tbody>
        {aaChanges.length > 0 && (
          <tr>
            <td colSpan={2}>
              <h6 className="mt-1">{t('Affected codons:')}</h6>
            </td>
          </tr>
        )}

        {changesHead.map((change) => (
          <tr key={change.pos}>
            <td>{change.qryAa === '-' ? t('Aminoacid deletion') : t('Aminoacid substitution')}</td>
            <td>
              <AminoacidMutationBadge mutation={change} />
            </td>
          </tr>
        ))}

        {changesTail.length > 0 && (
          <tr>
            <td>{'...'}</td>
            <td>{'...'}</td>
          </tr>
        )}

        {changesTail.length > 0 &&
          changesTail.map((change) => (
            <tr key={change.pos}>
              <td>{change.qryAa === '-' ? t('Aminoacid deletion') : t('Aminoacid substitution')}</td>
              <td>
                <AminoacidMutationBadge mutation={change} />
              </td>
            </tr>
          ))}
      </tbody>
    </TableSlim>
  )
}
