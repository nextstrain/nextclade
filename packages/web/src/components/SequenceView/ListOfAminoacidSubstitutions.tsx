import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import type { AminoacidSubstitution } from 'src/algorithms/types'
import { formatAAMutation } from 'src/helpers/formatMutation'
import { truncateList } from 'src/components/Results/truncateList'

const LIST_OF_AA_MUTATIONS_MAX_ITEMS = 15 as const

export interface ListOfAminoacidChangesProps {
  readonly aminoacidSubstitutions: DeepReadonly<AminoacidSubstitution[]>
}

export function ListOfAminoacidSubstitutions({ aminoacidSubstitutions }: ListOfAminoacidChangesProps) {
  const { t } = useTranslation()

  const totalChanges = aminoacidSubstitutions.length

  let aminoacidMutationItems = aminoacidSubstitutions.map((sub) => {
    const notation = formatAAMutation(sub)
    return <li key={notation}>{notation}</li>
  })

  aminoacidMutationItems = truncateList(aminoacidMutationItems, LIST_OF_AA_MUTATIONS_MAX_ITEMS, t('...more'))

  return (
    <div>
      {t('Aminoacid substitutions ({{totalChanges}})', { totalChanges })}
      <ul>{aminoacidMutationItems}</ul>
    </div>
  )
}
