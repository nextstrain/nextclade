import React from 'react'

import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideRange } from 'src/types'
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

  let nonACGTNsItems = nonACGTNs.map(({ character, range }) => {
    const rangeStr = formatRange(range)
    const value = `${character}: ${rangeStr}`
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
