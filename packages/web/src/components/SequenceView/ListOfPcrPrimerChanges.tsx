import React from 'react'

import type { DeepReadonly } from 'ts-essentials'
import { useTranslation } from 'react-i18next'

import type { PcrPrimerChange } from 'src/algorithms/types'
import { Li, Ul } from 'src/components/Common/List'
import { formatMutation } from 'src/helpers/formatMutation'

export interface ListOfPcrPrimerChangesProps {
  readonly pcrPrimerChanges: DeepReadonly<PcrPrimerChange[]>
  readonly totalPcrPrimerChanges: number
}

export function ListOfPcrPrimerChanges({ pcrPrimerChanges, totalPcrPrimerChanges }: ListOfPcrPrimerChangesProps) {
  const { t } = useTranslation()

  const items = pcrPrimerChanges.map(({ primer, substitutions }) => {
    const { name } = primer
    return (
      <Li key={name}>
        {t(`in "${name}":`)}
        <Ul>
          {substitutions.map((mut) => {
            const notation = formatMutation(mut)
            return <Li key={notation}>{notation}</Li>
          })}
        </Ul>
      </Li>
    )
  })

  return (
    <div>
      {t('PCR primer changes ({{totalChanges}})', { totalChanges: totalPcrPrimerChanges })}
      <Ul>{items}</Ul>
    </div>
  )
}
