import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideRange } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'
import { truncateList } from 'src/components/Results/truncateList'

const LIST_OF_NONACGTN_MAX_ITEMS = 10 as const

export interface ListOfNonACGTNsProps {
  nonACGTNs: DeepReadonly<NucleotideRange[]>
  totalNonACGTNs: number
}

export function ListOfNonACGTNs({ nonACGTNs, totalNonACGTNs }: ListOfNonACGTNsProps) {
  const { t } = useTranslation()

  let nonACGTNsItems = nonACGTNs.map(({ nuc, begin, end }) => {
    const range = formatRange(begin, end)
    const value = `${nuc}: ${range}`
    return <li key={value}>{value}</li>
  })

  nonACGTNsItems = truncateList(nonACGTNsItems, LIST_OF_NONACGTN_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Non-ACGTN ({{totalNonACGTNs}})', { totalNonACGTNs })}</div>
      <ul>{nonACGTNsItems}</ul>
    </div>
  )
}
