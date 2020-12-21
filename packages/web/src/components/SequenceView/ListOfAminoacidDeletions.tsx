import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import type { AminoacidDeletion } from 'src/algorithms/types'
import { formatAADeletion } from 'src/helpers/formatMutation'
import { truncateList } from 'src/components/Results/truncateList'

const LIST_OF_AA_DELETIONS_MAX_ITEMS = 15 as const

export interface ListOfAminoacidChangesProps {
  readonly aminoacidDeletions: DeepReadonly<AminoacidDeletion[]>
}

export function ListOfAminoacidDeletions({ aminoacidDeletions }: ListOfAminoacidChangesProps) {
  const { t } = useTranslation()

  const totalChanges = aminoacidDeletions.length

  let aminoacidMutationItems = aminoacidDeletions.map((deletion) => {
    const notation = formatAADeletion(deletion)
    return <li key={notation}>{notation}</li>
  })

  aminoacidMutationItems = truncateList(aminoacidMutationItems, LIST_OF_AA_DELETIONS_MAX_ITEMS, t('...more'))

  return (
    <div>
      {t('Aminoacid deletions ({{totalChanges}})', { totalChanges })}
      <ul>{aminoacidMutationItems}</ul>
    </div>
  )
}
