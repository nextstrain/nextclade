import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import { formatRange } from 'src/helpers/formatRange'
import type { NucleotideDeletion } from 'src/algorithms/types'
import { truncateList } from 'src/components/Results/truncateList'

const LIST_OF_GAPS_MAX_ITEMS = 10 as const

export interface ListOfGapsProps {
  readonly deletions: DeepReadonly<NucleotideDeletion[]>
}

export function ListOfGaps({ deletions }: ListOfGapsProps) {
  const { t } = useTranslation()

  let gapItems = deletions.map(({ start, length }) => {
    const range = formatRange(start, start + length)
    return <li key={range}>{range}</li>
  })

  gapItems = truncateList(gapItems, LIST_OF_GAPS_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Gaps:')}</div>
      <ul>{gapItems}</ul>
    </div>
  )
}
