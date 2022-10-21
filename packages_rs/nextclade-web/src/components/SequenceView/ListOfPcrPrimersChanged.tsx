import React from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'

import type { PcrPrimer } from 'src/types'
import { Li, Ul } from 'src/components/Common/List'

export interface ListOfPcrPrimersChangedProps {
  pcrPrimersChanged: PcrPrimer[]
}

export function ListOfPcrPrimersChanged({ pcrPrimersChanged }: ListOfPcrPrimersChangedProps) {
  const { t } = useTranslation()

  return (
    <div>
      {t('PCR primer changes: ({{total}})', { total: pcrPrimersChanged.length })}
      <Ul>
        {pcrPrimersChanged.map(({ name }) => {
          return <Li key={name}>{name}</Li>
        })}
      </Ul>
    </div>
  )
}
