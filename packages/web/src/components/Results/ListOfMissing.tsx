import React from 'react'

import { useTranslation } from 'react-i18next'
import type { DeepReadonly } from 'ts-essentials'

import type { NucleotideRange } from 'src/algorithms/types'
import { formatRange } from 'src/helpers/formatRange'
import { truncateList } from 'src/components/Results/truncateList'
import { getTotalMissing } from 'src/components/Results/getTotalMissing'

const LIST_OF_TOOLTIP_MAX_ITEMS = 10 as const

export interface ListOfMissingProps {
  missing: DeepReadonly<NucleotideRange[]>
}

export function ListOfMissing({ missing }: ListOfMissingProps) {
  const { t } = useTranslation()

  const totalMissing = getTotalMissing(missing)

  let missingItems = missing.map(({ range: { begin, end } }) => {
    const range = formatRange(begin, end)
    return <li key={range}>{range}</li>
  })

  missingItems = truncateList(missingItems, LIST_OF_TOOLTIP_MAX_ITEMS, t('...more'))

  return (
    <div>
      <div>{t('Missing ({{totalMissing}})', { totalMissing })}</div>
      <ul>{missingItems}</ul>
    </div>
  )
}
