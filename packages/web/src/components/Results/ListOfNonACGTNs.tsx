import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideRange } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'
import { truncateList } from 'src/components/Results/truncateList'

const LIST_OF_TOOLTIP_MAX_ITEMS = 10 as const

export interface ListOfNonACGTNsProps {
  nonACGTNs: DeepReadonly<NucleotideRange[]>
}

export function ListOfNonACGTNs({ nonACGTNs }: ListOfNonACGTNsProps) {
  const { t } = useTranslation()

  let nonACGTNsItems = nonACGTNs.map(({ range: { begin, end } }) => {
    const range = formatRange(begin, end)
    return <li key={range}>{range}</li>
  })

  nonACGTNsItems = truncateList(nonACGTNsItems, LIST_OF_TOOLTIP_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('NonACGTNs:')}</div>
      <ul>{nonACGTNsItems}</ul>
    </div>
  )
}
