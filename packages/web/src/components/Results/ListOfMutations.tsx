import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import type { SubstitutionsWithAminoacids } from 'src/algorithms/types'
import { formatMutation } from 'src/helpers/formatMutation'
import { truncateList } from 'src/components/Results/truncateList'
import { Li, Ul } from 'src/components/Common/List'

const LIST_OF_MUTATIONS_MAX_ITEMS = 10 as const

export interface ListOfMutations {
  substitutions: DeepReadonly<SubstitutionsWithAminoacids[]>
}

export function ListOfMutations({ substitutions }: ListOfMutations) {
  const { t } = useTranslation()

  const totalMutations = substitutions.length

  let mutationItems = substitutions.map(({ pos, queryNuc, refNuc }) => {
    const mut = formatMutation({ pos, queryNuc, refNuc })
    return <Li key={mut}>{mut}</Li>
  })

  mutationItems = truncateList(mutationItems, LIST_OF_MUTATIONS_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Mutations ({{totalMutations}})', { totalMutations })}</div>
      <Ul>{mutationItems}</Ul>
    </div>
  )
}
