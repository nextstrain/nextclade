import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideRange } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'
import { truncateList } from 'src/components/Results/truncateList'
import { Li, Ul } from 'src/components/Common/List'

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
    return <Li key={value}>{value}</Li>
  })

  nonACGTNsItems = truncateList(nonACGTNsItems, LIST_OF_NONACGTN_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Non-ACGTN ({{totalNonACGTNs}})', { totalNonACGTNs })}</div>
      <Ul>{nonACGTNsItems}</Ul>
    </div>
  )
}
