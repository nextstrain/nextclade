import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import type { AminoacidDeletion } from 'src/algorithms/types'
import { formatAADeletion } from 'src/helpers/formatMutation'

export interface ListOfAminoacidChangesProps {
  readonly aminoacidDeletions: DeepReadonly<AminoacidDeletion[]>
}

export function ListOfAminoacidDeletions({ aminoacidDeletions }: ListOfAminoacidChangesProps) {
  const { t } = useTranslation()

  const totalChanges = aminoacidDeletions.length

  const aminoacidMutationItems = aminoacidDeletions.map((deletion) => {
    const notation = formatAADeletion(deletion)
    return <li key={notation}>{notation}</li>
  })

  return (
    <div>
      {t('Aminoacid deletions ({{totalChanges}})', { totalChanges })}
      <ul>{aminoacidMutationItems}</ul>
    </div>
  )
}
