import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import type { SubstitutionsWithAminoacids } from 'src/algorithms/types'
import { formatMutation } from 'src/helpers/formatMutation'
import { truncateList } from 'src/components/Results/truncateList'

const LIST_OF_MUTATIONS_MAX_ITEMS = 10 as const

export interface ListOfMutations {
  substitutions: DeepReadonly<SubstitutionsWithAminoacids[]>
}

export function ListOfMutations({ substitutions }: ListOfMutations) {
  const { t } = useTranslation()

  let mutationItems = substitutions.map(({ pos, queryNuc, refNuc }) => {
    const mut = formatMutation({ pos, queryNuc, refNuc })
    return <li key={mut}>{mut}</li>
  })

  mutationItems = truncateList(mutationItems, LIST_OF_MUTATIONS_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Mutations:')}</div>
      <ul>{mutationItems}</ul>
    </div>
  )
}
