import React, { useMemo } from 'react'
import { useTranslationSafe as useTranslation } from 'src/helpers/useTranslationSafe'
import type { NucDelRange } from 'src/types'
import { formatRange } from 'src/helpers/formatRange'
import { truncateList } from 'src/components/Results/truncateList'
import { Li, Ul } from 'src/components/Common/List'

const LIST_OF_GAPS_MAX_ITEMS = 10 as const

export interface ListOfGapsProps {
  readonly deletions: NucDelRange[]
}

export function ListOfGaps({ deletions }: ListOfGapsProps) {
  const { t } = useTranslation()

  const gapItems = useMemo(() => {
    const gapItems = deletions.map(({ range }) => {
      const rangeStr = formatRange(range)
      return <Li key={rangeStr}>{rangeStr}</Li>
    })

    return truncateList(gapItems, LIST_OF_GAPS_MAX_ITEMS, t('...more'))
  }, [deletions, t])

  return <Ul>{gapItems}</Ul>
}
