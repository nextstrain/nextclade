import React from 'react'

import { AminoacidDeletion, AminoacidSubstitution } from 'src/types'
import { AminoacidMutationBadge } from 'src/components/Common/MutationBadge'
import { TableSlim } from 'src/components/Common/TableSlim'
import { useTranslationSafe } from 'src/helpers/useTranslationSafe'

export interface ListOfMutationsTruncatedProps {
  aaSubstitutions: AminoacidSubstitution[]
  aaDeletions: AminoacidDeletion[]
  maxRows?: number
}

export function ListOfAaChangesFlatTruncated({
  aaSubstitutions,
  aaDeletions,
  maxRows = 6,
}: ListOfMutationsTruncatedProps) {
  const { t } = useTranslationSafe()

  const subs = aaSubstitutions.map((sub) => ({ ...sub, type: 'substitution' }))
  const dels = aaDeletions.map((del) => ({ ...del, type: 'deletion' }))
  const changes = [...subs, ...dels]

  let changesHead = changes
  let changesTail: typeof changes = []
  if (changes.length > maxRows) {
    changesHead = changes.slice(0, (maxRows + 1) / 2)
    changesTail = changes.slice(-maxRows / 2)
  }

  return (
    <TableSlim borderless className="mb-1">
      <thead />
      <tbody>
        <tr className="mb-2">
          <td colSpan={2}>
            <h6>{t('Aminoacid changes ({{ n }})', { n: changes.length })}</h6>
          </td>
        </tr>

        {changesHead.map((change) => (
          <tr key={change.codon}>
            <td>{change.type === 'substitution' ? t('Substitution') : t('Deletion')}</td>
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
            <tr key={change.codon}>
              <td>{change.type === 'substitution' ? t('Substitution') : t('Deletion')}</td>
              <td>
                <AminoacidMutationBadge mutation={change} />
              </td>
            </tr>
          ))}
      </tbody>
    </TableSlim>
  )
}
